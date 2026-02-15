import type { PlatformAdapter, NormalizedOrder } from "./types";
import type { IntegrationPlatform } from "@prisma/client";

/**
 * Zomato Webhook Adapter
 *
 * Normalizes Zomato webhook payloads to internal order format.
 * Handles missing/partial data gracefully - orders > perfection.
 *
 * NOTE: Actual Zomato API structure may vary by region/partnership.
 * This adapter should be updated based on real integration docs.
 */

interface ZomatoPayload {
  order_id?: string;
  restaurant_id?: string;
  res_id?: string; // Alternative field name
  customer?: {
    name?: string;
    phone?: string;
    mobile?: string; // Alternative field name
  };
  items?: Array<{
    id?: string;
    item_id?: string;
    name?: string;
    item_name?: string;
    quantity?: number;
    qty?: number;
    price?: number;
    item_price?: number;
    total_price?: number;
    special_instructions?: string;
  }>;
  total?: number;
  order_total?: number;
  sub_total?: number;
  notes?: string;
  special_instructions?: string;
  table_no?: string;
  table_number?: string;
  // Allow additional properties
  [key: string]: unknown;
}

export const zomatoAdapter: PlatformAdapter = {
  platform: "ZOMATO" as IntegrationPlatform,

  getExternalRestaurantId(payload: unknown): string {
    const p = payload as ZomatoPayload;
    const id = p.restaurant_id || p.res_id;

    if (!id) {
      throw new Error("Missing restaurant_id in Zomato payload");
    }

    return String(id);
  },

  getExternalOrderId(payload: unknown): string {
    const p = payload as ZomatoPayload;
    const id = p.order_id;

    if (!id) {
      throw new Error("Missing order_id in Zomato payload");
    }

    return String(id);
  },

  isValidPayload(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") return false;

    const p = payload as ZomatoPayload;

    // Must have order_id and at least one item
    if (!p.order_id) return false;
    if (!p.items || !Array.isArray(p.items) || p.items.length === 0) return false;

    return true;
  },

  normalize(payload: unknown): NormalizedOrder {
    const p = payload as ZomatoPayload;

    // Extract customer info (handle various field names and missing data)
    const customerName = p.customer?.name || "Zomato Customer";
    const customerPhone = p.customer?.phone || p.customer?.mobile || null;

    // Extract table number
    const tableNumber = p.table_no || p.table_number || null;

    // Extract notes
    const notes = p.notes || p.special_instructions || null;

    // Normalize items
    const items = (p.items || []).map((item) => ({
      external_item_id: String(item.id || item.item_id || "unknown"),
      name: item.name || item.item_name || "Unknown Item",
      quantity: item.quantity || item.qty || 1,
      price: item.price || item.item_price || item.total_price || 0,
      notes: item.special_instructions,
    }));

    // Extract total (may recalculate server-side)
    const totalAmount = p.total || p.order_total || p.sub_total;

    return {
      external_order_id: String(p.order_id),
      customer_name: customerName,
      customer_phone: customerPhone,
      table_number: tableNumber,
      notes,
      items,
      total_amount: totalAmount,
    };
  },
};
