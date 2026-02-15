import { prisma } from "../../utils/prisma";
import { encrypt, decrypt } from "../../utils/crypto";
import type {
  IntegrationPlatform,
  WebhookLogStatus,
  Prisma,
} from "@prisma/client";

// ==========================================
// Integration Config
// ==========================================

export interface CreateConfigData {
  restaurant_id: string;
  platform: IntegrationPlatform;
  external_restaurant_id: string;
  webhook_secret: string; // Plaintext - will be encrypted
  auto_accept?: boolean;
}

/**
 * Create integration config with encrypted secret
 */
export async function createIntegrationConfig(data: CreateConfigData) {
  const { ciphertext, iv } = encrypt(data.webhook_secret);

  return prisma.integrationConfig.create({
    data: {
      restaurant_id: data.restaurant_id,
      platform: data.platform,
      external_restaurant_id: data.external_restaurant_id,
      encrypted_secret: ciphertext,
      iv,
      auto_accept: data.auto_accept ?? false,
      is_enabled: false, // Start disabled until menu mapping done
    },
    select: {
      id: true,
      restaurant_id: true,
      platform: true,
      external_restaurant_id: true,
      is_enabled: true,
      auto_accept: true,
      created_at: true,
      rotated_at: true,
    },
  });
}

/**
 * Find config by restaurant and platform
 */
export async function findConfigByRestaurant(
  restaurantId: string,
  platform: IntegrationPlatform
) {
  return prisma.integrationConfig.findUnique({
    where: {
      restaurant_id_platform: {
        restaurant_id: restaurantId,
        platform,
      },
    },
  });
}

/**
 * Find config by external restaurant ID (for webhook lookup)
 */
export async function findConfigByExternalId(
  externalRestaurantId: string,
  platform: IntegrationPlatform
) {
  return prisma.integrationConfig.findUnique({
    where: {
      external_restaurant_id_platform: {
        external_restaurant_id: externalRestaurantId,
        platform,
      },
    },
    include: {
      restaurant: {
        select: { id: true, name: true, tenant_id: true },
      },
    },
  });
}

/**
 * Get decrypted webhook secret for signature verification
 */
export async function getDecryptedSecret(configId: string): Promise<string | null> {
  const config = await prisma.integrationConfig.findUnique({
    where: { id: configId },
    select: { encrypted_secret: true, iv: true },
  });

  if (!config) return null;

  return decrypt(config.encrypted_secret, config.iv);
}

/**
 * Update integration config
 */
export async function updateIntegrationConfig(
  configId: string,
  data: {
    is_enabled?: boolean;
    external_restaurant_id?: string;
    webhook_secret?: string;
    auto_accept?: boolean;
  }
) {
  const updateData: Prisma.IntegrationConfigUpdateInput = {
    is_enabled: data.is_enabled,
    external_restaurant_id: data.external_restaurant_id,
    auto_accept: data.auto_accept,
  };

  // Re-encrypt if secret changed
  if (data.webhook_secret) {
    const { ciphertext, iv } = encrypt(data.webhook_secret);
    updateData.encrypted_secret = ciphertext;
    updateData.iv = iv;
    updateData.rotated_at = new Date();
  }

  return prisma.integrationConfig.update({
    where: { id: configId },
    data: updateData,
    select: {
      id: true,
      restaurant_id: true,
      platform: true,
      external_restaurant_id: true,
      is_enabled: true,
      auto_accept: true,
      created_at: true,
      rotated_at: true,
    },
  });
}

/**
 * List configs for a tenant (through restaurant relation)
 */
export async function listConfigsByTenant(tenantId: string) {
  return prisma.integrationConfig.findMany({
    where: { 
      restaurant: {
        tenant_id: tenantId
      }
    },
    select: {
      id: true,
      restaurant_id: true,
      platform: true,
      external_restaurant_id: true,
      is_enabled: true,
      auto_accept: true,
      created_at: true,
      rotated_at: true,
      restaurant: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

/**
 * Delete integration config
 */
export async function deleteIntegrationConfig(configId: string) {
  return prisma.integrationConfig.delete({
    where: { id: configId },
  });
}

// ==========================================
// Menu Mapping
// ==========================================

/**
 * Create menu mapping
 */
export async function createMenuMap(data: {
  integration_id: string;
  product_id: string;
  external_item_id: string;
  external_item_name?: string;
}) {
  return prisma.integrationMenuMap.create({
    data: {
      integration_id: data.integration_id,
      product_id: data.product_id,
      external_item_id: data.external_item_id,
      external_item_name: data.external_item_name,
    },
    include: {
      product: {
        select: { id: true, name: true, price: true },
      },
    },
  });
}

/**
 * Bulk create menu mappings
 */
export async function bulkCreateMenuMaps(
  integrationId: string,
  mappings: { product_id: string; external_item_id: string; external_item_name?: string }[]
) {
  return prisma.integrationMenuMap.createMany({
    data: mappings.map((m) => ({
      integration_id: integrationId,
      product_id: m.product_id,
      external_item_id: m.external_item_id,
      external_item_name: m.external_item_name,
    })),
    skipDuplicates: true,
  });
}

/**
 * Get menu map by external item ID
 */
export async function findMenuMapByExternalId(
  integrationId: string,
  externalItemId: string
) {
  return prisma.integrationMenuMap.findUnique({
    where: {
      integration_id_external_item_id: {
        integration_id: integrationId,
        external_item_id: externalItemId,
      },
    },
    include: {
      product: {
        select: { id: true, name: true, price: true, is_active: true },
      },
    },
  });
}

/**
 * Get all menu maps for an integration
 */
export async function listMenuMaps(integrationId: string) {
  return prisma.integrationMenuMap.findMany({
    where: { integration_id: integrationId },
    include: {
      product: {
        select: { id: true, name: true, price: true, is_active: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

/**
 * Update menu mapping
 */
export async function updateMenuMap(
  mapId: string,
  data: {
    product_id?: string;
    external_item_id?: string;
    external_item_name?: string;
    is_active?: boolean;
  }
) {
  return prisma.integrationMenuMap.update({
    where: { id: mapId },
    data,
    include: {
      product: {
        select: { id: true, name: true, price: true },
      },
    },
  });
}

/**
 * Delete menu mapping
 */
export async function deleteMenuMap(mapId: string) {
  return prisma.integrationMenuMap.delete({
    where: { id: mapId },
  });
}

// ==========================================
// Webhook Logs
// ==========================================

/**
 * Create webhook log entry
 */
export async function createWebhookLog(data: {
  integration_id: string;
  platform: IntegrationPlatform;
  restaurant_id: string;
  external_event_id?: string;
  payload_raw: object;
  signature_valid: boolean;
}) {
  return prisma.integrationWebhookLog.create({
    data: {
      integration_id: data.integration_id,
      platform: data.platform,
      restaurant_id: data.restaurant_id,
      external_event_id: data.external_event_id,
      payload_raw: data.payload_raw as Prisma.InputJsonValue,
      signature_valid: data.signature_valid,
      status: "RECEIVED",
    },
  });
}

/**
 * Update webhook log status
 */
export async function updateWebhookLogStatus(
  logId: string,
  status: WebhookLogStatus,
  data?: {
    failure_reason?: string;
    order_id?: string;
    replayed_by?: string;
  }
) {
  const updateData: Prisma.IntegrationWebhookLogUpdateInput = {
    status,
    processed_at: status === "PROCESSED" || status === "FAILED" ? new Date() : undefined,
    failure_reason: data?.failure_reason,
    order_id: data?.order_id,
    replayed_by: data?.replayed_by,
    replayed_at: data?.replayed_by ? new Date() : undefined,
  };

  return prisma.integrationWebhookLog.update({
    where: { id: logId },
    data: updateData,
  });
}

/**
 * Find webhook log by ID
 */
export async function findWebhookLogById(logId: string) {
  return prisma.integrationWebhookLog.findUnique({
    where: { id: logId },
    include: {
      integration: {
        select: {
          id: true,
          platform: true,
          external_restaurant_id: true,
          restaurant: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

/**
 * List webhook logs with filters
 */
export async function listWebhookLogs(params: {
  tenant_id?: string;
  restaurant_id?: string;
  integration_id?: string;
  status?: WebhookLogStatus;
  platform?: IntegrationPlatform;
  from_date?: Date;
  to_date?: Date;
  page: number;
  limit: number;
}) {
  const where: Prisma.IntegrationWebhookLogWhereInput = {};

  // Filter by tenant through restaurant relation
  if (params.tenant_id) {
    where.integration = {
      restaurant: {
        tenant_id: params.tenant_id
      }
    };
  }
  if (params.restaurant_id) where.restaurant_id = params.restaurant_id;
  if (params.integration_id) where.integration_id = params.integration_id;
  if (params.status) where.status = params.status;
  if (params.platform) where.platform = params.platform;

  if (params.from_date || params.to_date) {
    where.received_at = {};
    if (params.from_date) where.received_at.gte = params.from_date;
    if (params.to_date) where.received_at.lte = params.to_date;
  }

  const [logs, total] = await Promise.all([
    prisma.integrationWebhookLog.findMany({
      where,
      orderBy: { received_at: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true,
        platform: true,
        external_event_id: true,
        signature_valid: true,
        status: true,
        failure_reason: true,
        order_id: true,
        received_at: true,
        processed_at: true,
        replayed_by: true,
        replayed_at: true,
      },
    }),
    prisma.integrationWebhookLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get webhook log with full payload (for replay)
 */
export async function getWebhookLogForReplay(logId: string) {
  return prisma.integrationWebhookLog.findUnique({
    where: { id: logId },
    include: {
      integration: {
        select: {
          id: true,
          platform: true,
          restaurant_id: true,
          is_enabled: true,
          restaurant: {
            select: {
              tenant_id: true,
            },
          },
        },
      },
    },
  });
}

/**
 * List webhook logs for admin (cross-tenant)
 */
export async function listWebhookLogsForAdmin(params: {
  skip: number;
  take: number;
  status?: WebhookLogStatus;
  platform?: IntegrationPlatform;
  tenantId?: string;
}) {
  const where: Prisma.IntegrationWebhookLogWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.platform) where.platform = params.platform;
  if (params.tenantId) {
    where.integration = {
      restaurant: {
        tenant_id: params.tenantId,
      },
    };
  }

  const [logs, total] = await Promise.all([
    prisma.integrationWebhookLog.findMany({
      where,
      orderBy: { received_at: "desc" },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        platform: true,
        restaurant_id: true,
        external_event_id: true,
        signature_valid: true,
        status: true,
        failure_reason: true,
        order_id: true,
        received_at: true,
        processed_at: true,
        replayed_by: true,
        replayed_at: true,
      },
    }),
    prisma.integrationWebhookLog.count({ where }),
  ]);

  return { logs, total };
}
