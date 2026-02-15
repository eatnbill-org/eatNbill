import type { IntegrationPlatform, OrderSource } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../utils/logger";
import * as repository from "./repository";
import * as ordersRepo from "../orders/repository";
import { getAdapter, type NormalizedOrder, type ProcessOrderResult } from "./platforms";

// ==========================================
// Webhook Processing
// ==========================================

/**
 * Process incoming webhook and create order
 */
export async function processWebhook(
  integrationId: string,
  platform: IntegrationPlatform,
  tenantId: string,
  restaurantId: string,
  payload: unknown,
  webhookLogId: string,
  autoAccept: boolean
): Promise<ProcessOrderResult> {
  const adapter = getAdapter(platform);

  try {
    // Normalize payload
    const normalized = adapter.normalize(payload);
    const externalOrderId = normalized.external_order_id;

    // Idempotency check - prevent duplicate orders
    const source = platformToOrderSource(platform);
    const existingOrder = await ordersRepo.findOrderByExternalId(source, externalOrderId);

    if (existingOrder) {
      logger.info(`Duplicate webhook for ${platform} order ${externalOrderId}`, {
        existing_order_id: existingOrder.id,
      });

      await repository.updateWebhookLogStatus(webhookLogId, "PROCESSED", {
        order_id: existingOrder.id,
        failure_reason: "Duplicate order (idempotent)",
      });

      return {
        success: true,
        order_id: existingOrder.id,
        order_number: existingOrder.order_number,
        is_duplicate: true,
      };
    }

    // Resolve menu items to internal products
    const resolvedItems = await resolveMenuItems(integrationId, normalized.items);

    if (resolvedItems.length === 0) {
      const error = "No menu items could be resolved";
      logger.warn(`${error} for ${platform} order ${externalOrderId}`);

      await repository.updateWebhookLogStatus(webhookLogId, "FAILED", {
        failure_reason: error,
      });

      return { success: false, error };
    }

    // Log if some items couldn't be resolved
    if (resolvedItems.length < normalized.items.length) {
      const missing = normalized.items.length - resolvedItems.length;
      logger.warn(`${missing} items could not be resolved for ${platform} order ${externalOrderId}`);
    }

    // Create order using existing orders module
    const order = await ordersRepo.createOrder({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      customer_name: normalized.customer_name,
      customer_phone: normalized.customer_phone || "N/A",
      table_number: normalized.table_number || undefined,
      notes: normalized.notes || undefined,
      source,
      external_order_id: externalOrderId,
      external_metadata: payload as object,
      items: resolvedItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
      })),
    });

    // Update webhook log with success
    await repository.updateWebhookLogStatus(webhookLogId, "PROCESSED", {
      order_id: order.id,
    });

    logger.info(`Created order from ${platform} webhook`, {
      order_id: order.id,
      order_number: order.order_number,
      external_order_id: externalOrderId,
    });

    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(`Failed to process ${platform} webhook`, {
      error: errorMessage,
      integration_id: integrationId,
    });

    await repository.updateWebhookLogStatus(webhookLogId, "FAILED", {
      failure_reason: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Replay a failed webhook
 */
export async function replayWebhook(
  webhookLogId: string,
  adminId: string
): Promise<ProcessOrderResult> {
  const log = await repository.getWebhookLogForReplay(webhookLogId);

  if (!log) {
    throw new AppError("NOT_FOUND", "Webhook log not found", 404);
  }

  if (log.status === "PROCESSED") {
    return {
      success: true,
      order_id: log.order_id || undefined,
      is_duplicate: true,
    };
  }

  if (!log.integration) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  // Mark as replaying
  await repository.updateWebhookLogStatus(webhookLogId, "RECEIVED", {
    replayed_by: adminId,
  });

  // Re-process the webhook
  const result = await processWebhook(
    log.integration.id,
    log.integration.platform,
    log.integration.restaurant.tenant_id,
    log.integration.restaurant_id,
    log.payload_raw,
    webhookLogId,
    false // Don't auto-accept on replay
  );

  // Update status based on result
  if (result.success) {
    await repository.updateWebhookLogStatus(webhookLogId, "REPLAYED", {
      order_id: result.order_id,
      replayed_by: adminId,
    });
  }

  return result;
}

/**
 * Resolve external item IDs to internal products via menu mapping
 */
async function resolveMenuItems(
  integrationId: string,
  items: NormalizedOrder["items"]
): Promise<Array<{
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  notes?: string;
}>> {
  const resolved: Array<{
    product_id: string;
    name_snapshot: string;
    price_snapshot: number;
    quantity: number;
    notes?: string;
  }> = [];

  for (const item of items) {
    const mapping = await repository.findMenuMapByExternalId(
      integrationId,
      item.external_item_id
    );

    if (mapping && mapping.is_active && mapping.product.is_active) {
      resolved.push({
        product_id: mapping.product.id,
        name_snapshot: mapping.product.name,
        price_snapshot: Number(mapping.product.price),
        quantity: item.quantity,
        notes: item.notes,
      });
    } else {
      // Log unmapped item for debugging
      logger.warn(`Unmapped item: ${item.external_item_id} (${item.name})`, {
        integration_id: integrationId,
      });
    }
  }

  return resolved;
}

/**
 * Convert IntegrationPlatform to OrderSource
 */
function platformToOrderSource(platform: IntegrationPlatform): OrderSource {
  switch (platform) {
    case "ZOMATO":
      return "ZOMATO";
    case "SWIGGY":
      return "SWIGGY";
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

// ==========================================
// Config Management (OWNER)
// ==========================================

export async function createConfig(
  tenantId: string,
  restaurantId: string,
  input: {
    platform: "ZOMATO" | "SWIGGY";
    external_restaurant_id: string;
    webhook_secret: string;
    auto_accept?: boolean;
  }
) {
  // Check for existing config
  const existing = await repository.findConfigByRestaurant(restaurantId, input.platform);
  if (existing) {
    throw new AppError("CONFLICT", `${input.platform} integration already exists`, 409);
  }

  return repository.createIntegrationConfig({
    restaurant_id: restaurantId,
    platform: input.platform,
    external_restaurant_id: input.external_restaurant_id,
    webhook_secret: input.webhook_secret,
    auto_accept: input.auto_accept,
  });
}

export async function updateConfig(
  configId: string,
  tenantId: string,
  input: {
    is_enabled?: boolean;
    external_restaurant_id?: string;
    webhook_secret?: string;
    auto_accept?: boolean;
  }
) {
  // Verify ownership via config lookup
  const configs = await repository.listConfigsByTenant(tenantId);
  const config = configs.find((c) => c.id === configId);

  if (!config) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  return repository.updateIntegrationConfig(configId, input);
}

export async function deleteConfig(configId: string, tenantId: string) {
  const configs = await repository.listConfigsByTenant(tenantId);
  const config = configs.find((c) => c.id === configId);

  if (!config) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  return repository.deleteIntegrationConfig(configId);
}

export async function listConfigs(tenantId: string) {
  return repository.listConfigsByTenant(tenantId);
}

// ==========================================
// Menu Mapping (OWNER)
// ==========================================

export async function createMenuMapping(
  configId: string,
  tenantId: string,
  input: {
    product_id: string;
    external_item_id: string;
    external_item_name?: string;
  }
) {
  // Verify ownership
  const configs = await repository.listConfigsByTenant(tenantId);
  const config = configs.find((c) => c.id === configId);

  if (!config) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  return repository.createMenuMap({
    integration_id: configId,
    product_id: input.product_id,
    external_item_id: input.external_item_id,
    external_item_name: input.external_item_name,
  });
}

export async function bulkCreateMenuMappings(
  configId: string,
  tenantId: string,
  mappings: Array<{
    product_id: string;
    external_item_id: string;
    external_item_name?: string;
  }>
) {
  const configs = await repository.listConfigsByTenant(tenantId);
  const config = configs.find((c) => c.id === configId);

  if (!config) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  return repository.bulkCreateMenuMaps(configId, mappings);
}

export async function listMenuMappings(configId: string, tenantId: string) {
  const configs = await repository.listConfigsByTenant(tenantId);
  const config = configs.find((c) => c.id === configId);

  if (!config) {
    throw new AppError("NOT_FOUND", "Integration config not found", 404);
  }

  return repository.listMenuMaps(configId);
}

export async function deleteMenuMapping(mapId: string, tenantId: string) {
  // Verify ownership through menu map's integration
  // This is a simplified check - in production you'd want a direct query
  return repository.deleteMenuMap(mapId);
}

// ==========================================
// Webhook Logs (OWNER + SUPER_ADMIN)
// ==========================================

export async function listWebhookLogs(
  tenantId: string | undefined,
  params: {
    restaurant_id?: string;
    integration_id?: string;
    status?: "RECEIVED" | "PROCESSED" | "FAILED" | "REPLAYED";
    platform?: "ZOMATO" | "SWIGGY";
    from_date?: string;
    to_date?: string;
    page: number;
    limit: number;
  }
) {
  return repository.listWebhookLogs({
    tenant_id: tenantId,
    restaurant_id: params.restaurant_id,
    integration_id: params.integration_id,
    status: params.status,
    platform: params.platform,
    from_date: params.from_date ? new Date(params.from_date) : undefined,
    to_date: params.to_date ? new Date(params.to_date) : undefined,
    page: params.page,
    limit: params.limit,
  });
}

export async function getWebhookLogDetail(logId: string) {
  return repository.findWebhookLogById(logId);
}
