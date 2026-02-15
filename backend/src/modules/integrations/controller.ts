import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import {
  createIntegrationConfigSchema,
  updateIntegrationConfigSchema,
  createMenuMapSchema,
  bulkCreateMenuMapSchema,
  listWebhookLogsQuerySchema,
} from "./schema";
import { getAdapter } from "./platforms";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../utils/logger";

// ==========================================
// Webhook Handlers (Public - no tenant auth)
// ==========================================

/**
 * POST /integrations/zomato/webhook
 * Handle incoming Zomato webhook
 */
export async function handleZomatoWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return handleWebhook(req, res, next, "ZOMATO");
}

/**
 * POST /integrations/swiggy/webhook
 * Handle incoming Swiggy webhook
 */
export async function handleSwiggyWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return handleWebhook(req, res, next, "SWIGGY");
}

/**
 * Generic webhook handler
 */
async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
  platform: "ZOMATO" | "SWIGGY"
) {
  try {
    const config = req.integrationConfig;
    const webhookLogId = req.webhookLogId;

    if (!config || !webhookLogId) {
      return next(new AppError("INTERNAL_ERROR", "Missing integration context", 500));
    }

    const result = await service.processWebhook(
      config.id,
      config.platform,
      config.tenant_id,
      config.restaurant_id,
      req.body,
      webhookLogId,
      config.auto_accept
    );

    // Always return 200 to prevent provider retries
    return res.json({
      success: result.success,
      order_id: result.order_id,
      order_number: result.order_number,
      is_duplicate: result.is_duplicate,
      error: result.error,
    });
  } catch (error) {
    logger.error(`Webhook handler error for ${platform}`, {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Return 200 even on error to prevent retries
    return res.json({
      success: false,
      error: "Internal processing error",
    });
  }
}

// ==========================================
// Config Management (OWNER only)
// ==========================================

/**
 * GET /integrations/config
 * List integration configs for tenant
 */
export async function listConfigs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;

    const configs = await service.listConfigs(tenantId);

    return res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /integrations/config
 * Create integration config
 */
export async function createConfig(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID required", 400));
    }

    const parsed = createIntegrationConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const config = await service.createConfig(tenantId, restaurantId, parsed.data);

    return res.status(201).json({
      success: true,
      message: "Integration config created",
      data: config,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /integrations/config/:id
 * Update integration config
 */
export async function updateConfig(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const configId = req.params.id as string | undefined;

    if (!configId || Array.isArray(configId)) {
      return next(new AppError("VALIDATION_ERROR", "Config ID required", 400));
    }

    const parsed = updateIntegrationConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const config = await service.updateConfig(configId, tenantId, parsed.data);

    return res.json({
      success: true,
      message: "Integration config updated",
      data: config,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /integrations/config/:id
 * Delete integration config
 */
export async function deleteConfig(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const configId = req.params.id as string | undefined;

    if (!configId || Array.isArray(configId)) {
      return next(new AppError("VALIDATION_ERROR", "Config ID required", 400));
    }

    await service.deleteConfig(configId, tenantId);

    return res.json({
      success: true,
      message: "Integration config deleted",
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// Menu Mapping (OWNER only)
// ==========================================

/**
 * GET /integrations/config/:id/menu-map
 * List menu mappings
 */
export async function listMenuMappings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const configId = req.params.id as string | undefined;

    if (!configId || Array.isArray(configId)) {
      return next(new AppError("VALIDATION_ERROR", "Config ID required", 400));
    }

    const mappings = await service.listMenuMappings(configId, tenantId);

    return res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /integrations/config/:id/menu-map
 * Create menu mapping
 */
export async function createMenuMapping(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const configId = req.params.id as string | undefined;

    if (!configId || Array.isArray(configId)) {
      return next(new AppError("VALIDATION_ERROR", "Config ID required", 400));
    }

    const parsed = createMenuMapSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const mapping = await service.createMenuMapping(configId, tenantId, parsed.data);

    return res.status(201).json({
      success: true,
      message: "Menu mapping created",
      data: mapping,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /integrations/config/:id/menu-map/bulk
 * Bulk create menu mappings
 */
export async function bulkCreateMenuMappings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const configId = req.params.id as string | undefined;

    if (!configId || Array.isArray(configId)) {
      return next(new AppError("VALIDATION_ERROR", "Config ID required", 400));
    }

    const parsed = bulkCreateMenuMapSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const result = await service.bulkCreateMenuMappings(
      configId,
      tenantId,
      parsed.data.mappings
    );

    return res.status(201).json({
      success: true,
      message: `${result.count} mappings created`,
      data: { count: result.count },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /integrations/menu-map/:mapId
 * Delete menu mapping
 */
export async function deleteMenuMapping(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;
    const mapId = req.params.mapId as string | undefined;

    if (!mapId || Array.isArray(mapId)) {
      return next(new AppError("VALIDATION_ERROR", "Map ID required", 400));
    }

    await service.deleteMenuMapping(mapId, tenantId);

    return res.json({
      success: true,
      message: "Menu mapping deleted",
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// Webhook Logs (OWNER + SUPER_ADMIN)
// ==========================================

/**
 * GET /integrations/logs
 * List webhook logs for tenant
 */
export async function listWebhookLogs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req.user!;

    const parsed = listWebhookLogsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const result = await service.listWebhookLogs(tenantId, parsed.data);

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / parsed.data.limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /integrations/logs/:id
 * Get webhook log detail
 */
export async function getWebhookLogDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const logId = req.params.id as string | undefined;

    if (!logId || Array.isArray(logId)) {
      return next(new AppError("VALIDATION_ERROR", "Log ID required", 400));
    }

    const log = await service.getWebhookLogDetail(logId);

    if (!log) {
      return next(new AppError("NOT_FOUND", "Webhook log not found", 404));
    }

    return res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// Replay (SUPER_ADMIN only)
// ==========================================

/**
 * POST /admin/integrations/webhooks/:id/replay
 * Replay failed webhook (SUPER_ADMIN only)
 */
export async function replayWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const adminId = req.adminUser?.adminId;
    const logId = req.params.id as string | undefined;

    if (!adminId) {
      return next(new AppError("UNAUTHORIZED", "Admin access required", 401));
    }

    if (!logId || Array.isArray(logId)) {
      return next(new AppError("VALIDATION_ERROR", "Log ID required", 400));
    }

    const result = await service.replayWebhook(logId, adminId);

    return res.json({
      success: result.success,
      message: result.success
        ? result.is_duplicate
          ? "Order already exists (idempotent)"
          : "Webhook replayed successfully"
        : "Replay failed",
      data: {
        order_id: result.order_id,
        order_number: result.order_number,
        is_duplicate: result.is_duplicate,
        error: result.error,
      },
    });
  } catch (error) {
    return next(error);
  }
}
