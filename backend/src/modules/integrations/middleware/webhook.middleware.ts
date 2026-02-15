import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { IntegrationPlatform } from "@prisma/client";
import { AppError } from "../../../middlewares/error.middleware";
import { env } from "../../../env";
import { redisClient } from "../../../utils/redis";
import { computeHmac, timingSafeEqual } from "../../../utils/crypto";
import * as repository from "../repository";
import { getAdapter } from "../platforms";
import { logger } from "../../../utils/logger";

// Extend Express Request for integration context
declare global {
  namespace Express {
    interface Request {
      integrationConfig?: {
        id: string;
        platform: IntegrationPlatform;
        tenant_id: string;
        restaurant_id: string;
        is_enabled: boolean;
        auto_accept: boolean;
      };
      webhookLogId?: string;
      rawBody?: string;
    }
  }
}

/**
 * Rate limiter for webhook endpoints
 * 100 requests per minute per external_restaurant_id
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many webhook requests",
  },
  keyGenerator: (req) => {
    // Rate limit by platform + body's restaurant ID
    const platformParam = req.params.platform;
    const platform = typeof platformParam === "string" ? platformParam : "unknown";
    try {
      const adapter = getAdapter(platform.toUpperCase() as IntegrationPlatform);
      const externalRestaurantId = adapter.getExternalRestaurantId(req.body);
      return `webhook:${platform}:${externalRestaurantId}`;
    } catch {
      // Fallback to IP if can't extract restaurant ID
      return `webhook:${platform}:${req.ip}`;
    }
  },
  store:
    env.REDIS_URL && redisClient.getClient()
      ? new RedisStore({
          sendCommand: (...args: string[]) =>
            redisClient.getClient()!.call(...(args as [string, ...string[]])) as Promise<any>,
          prefix: "rl:webhook:",
        })
      : undefined,
});

/**
 * Middleware to preserve raw body for signature verification
 * Must be applied BEFORE json parsing for webhook routes
 */
export function preserveRawBody(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  let data = "";

  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    req.rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}

/**
 * Verify webhook signature and resolve integration config
 */
export function verifyWebhookSignature(platform: IntegrationPlatform) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adapter = getAdapter(platform);

      // Validate payload structure
      if (!adapter.isValidPayload(req.body)) {
        logger.warn(`Invalid ${platform} webhook payload structure`);
        return next(new AppError("VALIDATION_ERROR", "Invalid payload structure", 400));
      }

      // Extract external restaurant ID
      let externalRestaurantId: string;
      try {
        externalRestaurantId = adapter.getExternalRestaurantId(req.body);
      } catch (error) {
        logger.warn(`Cannot extract restaurant ID from ${platform} webhook`);
        return next(new AppError("VALIDATION_ERROR", "Missing restaurant identifier", 400));
      }

      // Find integration config
      const config = await repository.findConfigByExternalId(externalRestaurantId, platform);

      if (!config) {
        logger.warn(`No integration config for ${platform}:${externalRestaurantId}`);
        return next(new AppError("NOT_FOUND", "Integration not configured", 404));
      }

      if (!config.is_enabled) {
        logger.info(`Disabled integration received webhook: ${platform}:${externalRestaurantId}`);
        return next(new AppError("FORBIDDEN", "Integration is disabled", 403));
      }

      // Verify signature
      const signature = getSignatureFromHeaders(req, platform);
      let signatureValid = false;

      if (signature && req.rawBody) {
        const secret = await repository.getDecryptedSecret(config.id);
        if (secret) {
          const expected = computeHmac(secret, req.rawBody);
          signatureValid = timingSafeEqual(signature, expected);
        }
      }

      // Log webhook (before processing)
      let externalOrderId: string | undefined;
      try {
        externalOrderId = adapter.getExternalOrderId(req.body);
      } catch {
        // OK if order ID extraction fails at this stage
      }

      const webhookLog = await repository.createWebhookLog({
        integration_id: config.id,
        platform,
        restaurant_id: config.restaurant.id,
        external_event_id: externalOrderId,
        payload_raw: req.body,
        signature_valid: signatureValid,
      });

      // If signature validation is required and failed, reject
      // In production, you may want to make this stricter
      if (!signatureValid) {
        logger.warn(`Invalid signature for ${platform} webhook`, {
          config_id: config.id,
          external_restaurant_id: externalRestaurantId,
        });

        await repository.updateWebhookLogStatus(webhookLog.id, "FAILED", {
          failure_reason: "Invalid webhook signature",
        });

        // Still return 200 to prevent retries, but don't process
        // Some providers keep retrying on non-200 responses
        return res.status(200).json({
          success: false,
          error: "Signature verification failed",
        });
      }

      // Attach context to request
      req.integrationConfig = {
        id: config.id,
        platform,
        tenant_id: config.restaurant.tenant_id,
        restaurant_id: config.restaurant.id,
        is_enabled: config.is_enabled,
        auto_accept: config.auto_accept,
      };
      req.webhookLogId = webhookLog.id;

      return next();
    } catch (error) {
      logger.error(`Webhook verification error for ${platform}`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return next(error);
    }
  };
}

/**
 * Extract signature from request headers based on platform
 */
function getSignatureFromHeaders(req: Request, platform: IntegrationPlatform): string | null {
  // Different platforms use different header names
  const headerNames: Record<IntegrationPlatform, string[]> = {
    ZOMATO: ["x-zomato-signature", "x-webhook-signature", "x-signature"],
    SWIGGY: ["x-swiggy-signature", "x-webhook-signature", "x-signature"],
  };

  const names = headerNames[platform] || ["x-webhook-signature"];

  for (const name of names) {
    const value = req.headers[name];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}
