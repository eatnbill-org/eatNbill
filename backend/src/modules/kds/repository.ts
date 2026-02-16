import { prisma } from "../../utils/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

// Active order statuses for KDS display
export const KDS_ACTIVE_STATUSES: OrderStatus[] = [
  "ACTIVE",
];

// Types
export interface KdsOrderWithItems {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  table_number: string | null;
  notes: string | null;
  total_amount: Prisma.Decimal;
  status: OrderStatus;
  source: string;
  placed_at: Date;
  confirmed_at: Date | null;
  preparing_at: Date | null;
  ready_at: Date | null;
  items: {
    id: string;
    name_snapshot: string;
    price_snapshot: Prisma.Decimal;
    quantity: number;
    notes: string | null;
  }[];
}

export interface KdsSettingsData {
  restaurant_id: string;
  sound_enabled: boolean;
  auto_clear_completed_after_seconds: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertKdsSettingsInput {
  sound_enabled?: boolean;
  auto_clear_completed_after_seconds?: number;
}

/**
 * Get all active orders for a restaurant (KDS display)
 * Orders are sorted by placed_at (oldest first) for FIFO processing
 */
export async function getActiveOrders(
  tenantId: string,
  restaurantId: string
): Promise<KdsOrderWithItems[]> {
  const orders = await prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: { in: KDS_ACTIVE_STATUSES },
    },
    include: {
      items: {
        select: {
          id: true,
          name_snapshot: true,
          price_snapshot: true,
          quantity: true,
          notes: true,
        },
      },
    },
    orderBy: [
      { status: "asc" }, // PLACED first, then CONFIRMED, PREPARING, READY
      { placed_at: "asc" }, // Oldest first within each status
    ],
  });

  return orders;
}

/**
 * Get a single order by ID for KDS (with items)
 */
export async function getOrderById(
  tenantId: string,
  restaurantId: string,
  orderId: string
): Promise<KdsOrderWithItems | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      restaurant_id: restaurantId,
    },
    include: {
      items: {
        select: {
          id: true,
          name_snapshot: true,
          price_snapshot: true,
          quantity: true,
          notes: true,
        },
      },
    },
  });

  return order;
}

/**
 * Get KDS settings for a restaurant
 */
export async function getSettings(
  restaurantId: string
): Promise<KdsSettingsData | null> {
  return prisma.kdsSettings.findUnique({
    where: { restaurant_id: restaurantId },
  });
}

/**
 * Upsert KDS settings for a restaurant
 */
export async function upsertSettings(
  restaurantId: string,
  data: UpsertKdsSettingsInput
): Promise<KdsSettingsData> {
  return prisma.kdsSettings.upsert({
    where: { restaurant_id: restaurantId },
    create: {
      restaurant_id: restaurantId,
      sound_enabled: data.sound_enabled ?? true,
      auto_clear_completed_after_seconds:
        data.auto_clear_completed_after_seconds ?? 300,
    },
    update: {
      ...(data.sound_enabled !== undefined && {
        sound_enabled: data.sound_enabled,
      }),
      ...(data.auto_clear_completed_after_seconds !== undefined && {
        auto_clear_completed_after_seconds:
          data.auto_clear_completed_after_seconds,
      }),
    },
  });
}

/**
 * Get order counts by status for KDS dashboard
 */
export async function getOrderCountsByStatus(
  tenantId: string,
  restaurantId: string
): Promise<Record<OrderStatus, number>> {
  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: { in: KDS_ACTIVE_STATUSES },
    },
    _count: { status: true },
  });

  // Initialize all active statuses with 0
  const result: Record<string, number> = {
    ACTIVE: 0,
  };

  for (const count of counts) {
    result[count.status] = count._count.status;
  }

  return result as Record<OrderStatus, number>;
}
