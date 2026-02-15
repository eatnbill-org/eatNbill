import type { IntegrationPlatform } from "@prisma/client";

/**
 * Normalized order format - canonical internal representation
 * All platform adapters must output this format
 */
export interface NormalizedOrderItem {
  external_item_id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface NormalizedOrder {
  external_order_id: string;
  customer_name: string;
  customer_phone: string | null;
  table_number?: string | null;
  notes?: string | null;
  items: NormalizedOrderItem[];
  total_amount?: number; // May be recalculated server-side
}

/**
 * Platform adapter interface
 * Each platform (Zomato, Swiggy) implements this
 */
export interface PlatformAdapter {
  platform: IntegrationPlatform;

  /**
   * Extract external restaurant ID from webhook payload
   */
  getExternalRestaurantId(payload: unknown): string;

  /**
   * Extract external order/event ID from webhook payload
   */
  getExternalOrderId(payload: unknown): string;

  /**
   * Normalize webhook payload to internal format
   * Must handle missing/partial data gracefully
   */
  normalize(payload: unknown): NormalizedOrder;

  /**
   * Validate webhook payload structure (basic shape check)
   * Returns true if payload is processable
   */
  isValidPayload(payload: unknown): boolean;
}

/**
 * Result of menu item resolution
 */
export interface ResolvedMenuItem {
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  notes?: string;
}

/**
 * Result of order processing
 */
export interface ProcessOrderResult {
  success: boolean;
  order_id?: string;
  order_number?: number;
  error?: string;
  is_duplicate?: boolean;
}
