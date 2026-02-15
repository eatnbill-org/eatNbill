import type { PlatformAdapter, NormalizedOrder } from "./types";
import type { IntegrationPlatform } from "@prisma/client";

/**
 * Swiggy Webhook Adapter
 *
 * Normalizes Swiggy webhook payloads to internal order format.
 * Handles missing/partial data gracefully - orders > perfection.
 *
 * NOTE: Actual Swiggy API structure may vary by region/partnership.
 * This adapter should be updated based on real integration docs.
 */

interface SwiggyPayload {
  orderId?: string;
  order_id?: string;
  outletId?: string;
  outlet_id?: string;
  restaurant_id?: string;
  customerDetails?: {
    name?: string;
    mobile?: string;
    phone?: string;
  };
  customer?: {
    name?: string;
    mobile?: string;
    phone?: string;
  };
  orderItems?: Array<{
    itemId?: string;
    item_id?: string;
    itemName?: string;
    item_name?: string;
    qty?: number;
    quantity?: number;
    itemPrice?: number;
    item_price?: number;
    price?: number;
    addOns?: Array<{
      name?: string;
      price?: number;
    }>;
    specialInstructions?: string;
    notes?: string;
  }>;
  items?: Array<{
    itemId?: string;
    item_id?: string;
    itemName?: string;
    item_name?: string;
    qty?: number;
    quantity?: number;
    itemPrice?: number;
    item_price?: number;
    price?: number;
  }>;
  orderTotal?: number;
  order_total?: number;
  total?: number;
  specialInstructions?: string;
  notes?: string;
  tableNumber?: string;
  table_number?: string;
  // Allow additional properties
  [key: string]: unknown;
}

export const swiggyAdapter: PlatformAdapter = {
  platform: "SWIGGY" as IntegrationPlatform,

  getExternalRestaurantId(payload: unknown): string {
    const p = payload as SwiggyPayload;
    const id = p.outletId || p.outlet_id || p.restaurant_id;

    if (!id) {
      throw new Error("Missing outletId in Swiggy payload");
    }

    return String(id);
  },

  getExternalOrderId(payload: unknown): string {
    const p = payload as SwiggyPayload;
    const id = p.orderId || p.order_id;

    if (!id) {
      throw new Error("Missing orderId in Swiggy payload");
    }

    return String(id);
  },

  isValidPayload(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") return false;

    const p = payload as SwiggyPayload;

    // Must have orderId and items
    if (!p.orderId && !p.order_id) return false;

    const items = p.orderItems || p.items;
    if (!items || !Array.isArray(items) || items.length === 0) return false;

    return true;
  },

  normalize(payload: unknown): NormalizedOrder {
    const p = payload as SwiggyPayload;

    // Extract customer info
    const customer = p.customerDetails || p.customer;
    const customerName = customer?.name || "Swiggy Customer";
    const customerPhone = customer?.mobile || customer?.phone || null;

    // Extract table number (rare for delivery but possible for dine-in)
    const tableNumber = p.tableNumber || p.table_number || null;

    // Extract notes
    const notes = p.specialInstructions || p.notes || null;

    // Normalize items (handle both field name conventions)
    const rawItems = p.orderItems || p.items || [];
    const items = rawItems.map((item) => ({
      external_item_id: String(item.itemId || item.item_id || "unknown"),
      name: item.itemName || item.item_name || "Unknown Item",
      quantity: item.qty || item.quantity || 1,
      price: item.itemPrice || item.item_price || item.price || 0,
      notes: (item as Record<string, unknown>).specialInstructions as string | undefined ||
             (item as Record<string, unknown>).notes as string | undefined,
    }));

    // Extract total
    const totalAmount = p.orderTotal || p.order_total || p.total;

    return {
      external_order_id: String(p.orderId || p.order_id),
      customer_name: customerName,
      customer_phone: customerPhone,
      table_number: tableNumber,
      notes,
      items,
      total_amount: totalAmount,
    };
  },
};
