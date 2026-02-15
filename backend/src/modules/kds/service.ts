import type { OrderStatus } from "@prisma/client";
import * as repository from "./repository";
import { AppError } from "../../middlewares/error.middleware";

// Types for KDS display
export interface KdsOrderDisplay {
  id: string;
  order_number: number;
  customer_name: string;
  table_number: string | null;
  notes: string | null;
  status: OrderStatus;
  source: string;
  placed_at: Date;
  confirmed_at: Date | null;
  preparing_at: Date | null;
  ready_at: Date | null;
  // Computed prep timers (in seconds)
  elapsed_since_placed: number;
  elapsed_since_preparing: number | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
  }[];
}

export interface KdsSettingsDisplay {
  sound_enabled: boolean;
  auto_clear_completed_after_seconds: number;
}

export interface KdsDashboard {
  orders: KdsOrderDisplay[];
  counts: {
    placed: number;
    confirmed: number;
    preparing: number;
    ready: number;
    total_active: number;
  };
  settings: KdsSettingsDisplay;
  server_time: string; // ISO timestamp for client sync
}

/**
 * Calculate elapsed time in seconds from a timestamp
 */
function elapsedSeconds(from: Date | null): number | null {
  if (!from) return null;
  return Math.floor((Date.now() - from.getTime()) / 1000);
}

/**
 * Transform repository order to KDS display format
 */
function toKdsOrderDisplay(
  order: repository.KdsOrderWithItems
): KdsOrderDisplay {
  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    table_number: order.table_number,
    notes: order.notes,
    status: order.status,
    source: order.source,
    placed_at: order.placed_at,
    confirmed_at: order.confirmed_at,
    preparing_at: order.preparing_at,
    ready_at: order.ready_at,
    elapsed_since_placed: elapsedSeconds(order.placed_at) ?? 0,
    elapsed_since_preparing: elapsedSeconds(order.preparing_at),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name_snapshot,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

/**
 * Get full KDS dashboard data for a restaurant
 * Includes active orders, counts, settings, and server timestamp
 */
export async function getKdsDashboard(
  tenantId: string,
  restaurantId: string
): Promise<KdsDashboard> {
  // Fetch orders, counts, and settings in parallel
  const [orders, counts, settings] = await Promise.all([
    repository.getActiveOrders(tenantId, restaurantId),
    repository.getOrderCountsByStatus(tenantId, restaurantId),
    repository.getSettings(restaurantId),
  ]);

  // Transform orders to display format with computed timers
  const ordersDisplay = orders.map(toKdsOrderDisplay);

  // Default settings if none exist
  const settingsDisplay: KdsSettingsDisplay = {
    sound_enabled: settings?.sound_enabled ?? true,
    auto_clear_completed_after_seconds:
      settings?.auto_clear_completed_after_seconds ?? 300,
  };

  return {
    orders: ordersDisplay,
    counts: {
      placed: counts.PLACED ?? 0,
      confirmed: counts.CONFIRMED ?? 0,
      preparing: counts.PREPARING ?? 0,
      ready: counts.READY ?? 0,
      total_active:
        (counts.PLACED ?? 0) +
        (counts.CONFIRMED ?? 0) +
        (counts.PREPARING ?? 0) +
        (counts.READY ?? 0),
    },
    settings: settingsDisplay,
    server_time: new Date().toISOString(),
  };
}

/**
 * Get active orders for KDS display
 */
export async function getActiveOrders(
  tenantId: string,
  restaurantId: string
): Promise<KdsOrderDisplay[]> {
  const orders = await repository.getActiveOrders(tenantId, restaurantId);
  return orders.map(toKdsOrderDisplay);
}

/**
 * Get a single order for KDS display
 */
export async function getOrder(
  tenantId: string,
  restaurantId: string,
  orderId: string
): Promise<KdsOrderDisplay> {
  const order = await repository.getOrderById(tenantId, restaurantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }
  return toKdsOrderDisplay(order);
}

/**
 * Get KDS settings for a restaurant
 */
export async function getSettings(
  restaurantId: string
): Promise<KdsSettingsDisplay> {
  const settings = await repository.getSettings(restaurantId);
  return {
    sound_enabled: settings?.sound_enabled ?? true,
    auto_clear_completed_after_seconds:
      settings?.auto_clear_completed_after_seconds ?? 300,
  };
}

/**
 * Update KDS settings for a restaurant
 * Only OWNER and MANAGER roles can update settings
 */
export async function updateSettings(
  restaurantId: string,
  data: {
    sound_enabled?: boolean;
    auto_clear_completed_after_seconds?: number;
  }
): Promise<KdsSettingsDisplay> {
  // Validate auto_clear range (30 seconds to 1 hour)
  if (data.auto_clear_completed_after_seconds !== undefined) {
    if (
      data.auto_clear_completed_after_seconds < 30 ||
      data.auto_clear_completed_after_seconds > 3600
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Auto-clear time must be between 30 and 3600 seconds",
        400
      );
    }
  }

  const settings = await repository.upsertSettings(restaurantId, data);
  return {
    sound_enabled: settings.sound_enabled,
    auto_clear_completed_after_seconds:
      settings.auto_clear_completed_after_seconds,
  };
}

/**
 * Get Supabase Realtime subscription info for KDS client
 * Returns the channel configuration for client-side subscription
 */
export function getRealtimeConfig(restaurantId: string) {
  return {
    channel: `kds:${restaurantId}`,
    table: "orders",
    schema: "public",
    filter: `restaurant_id=eq.${restaurantId}`,
    events: ["INSERT", "UPDATE", "DELETE"],
    // Client should use these settings to subscribe:
    // supabase.channel(config.channel)
    //   .on('postgres_changes', {
    //     event: '*',
    //     schema: config.schema,
    //     table: config.table,
    //     filter: config.filter
    //   }, callback)
    //   .subscribe()
  };
}
