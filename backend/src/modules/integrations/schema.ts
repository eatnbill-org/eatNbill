import { z } from "zod";

// ==========================================
// Integration Config Schemas
// ==========================================

export const createIntegrationConfigSchema = z.object({
  platform: z.enum(["ZOMATO", "SWIGGY"]),
  external_restaurant_id: z.string().min(1).max(100),
  webhook_secret: z.string().min(16).max(256),
  auto_accept: z.boolean().default(false),
});

export const updateIntegrationConfigSchema = z.object({
  is_enabled: z.boolean().optional(),
  external_restaurant_id: z.string().min(1).max(100).optional(),
  webhook_secret: z.string().min(16).max(256).optional(),
  auto_accept: z.boolean().optional(),
});

// ==========================================
// Menu Mapping Schemas
// ==========================================

export const createMenuMapSchema = z.object({
  product_id: z.string().uuid(),
  external_item_id: z.string().min(1).max(100),
  external_item_name: z.string().max(200).optional(),
});

export const updateMenuMapSchema = z.object({
  product_id: z.string().uuid().optional(),
  external_item_id: z.string().min(1).max(100).optional(),
  external_item_name: z.string().max(200).optional(),
  is_active: z.boolean().optional(),
});

export const bulkCreateMenuMapSchema = z.object({
  mappings: z.array(createMenuMapSchema).min(1).max(100),
});

// ==========================================
// Webhook Payload Schemas (Normalized)
// ==========================================

// Normalized item format (output from adapters)
export const normalizedOrderItemSchema = z.object({
  external_item_id: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  notes: z.string().optional(),
});

// Normalized order format (output from adapters)
export const normalizedOrderSchema = z.object({
  external_order_id: z.string(),
  customer_name: z.string().default("Guest"),
  customer_phone: z.string().nullable(),
  table_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(normalizedOrderItemSchema).min(1),
  total_amount: z.number().positive().optional(), // May recalculate server-side
});

// ==========================================
// Zomato Webhook Payload (Example structure)
// Actual structure may vary - adapter handles normalization
// ==========================================

export const zomatoWebhookPayloadSchema = z.object({
  order_id: z.string(),
  restaurant_id: z.string(),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })),
  total: z.number().optional(),
  notes: z.string().optional(),
  // Allow additional properties
}).passthrough();

// ==========================================
// Swiggy Webhook Payload (Example structure)
// ==========================================

export const swiggyWebhookPayloadSchema = z.object({
  orderId: z.string(),
  outletId: z.string(),
  customerDetails: z.object({
    name: z.string().optional(),
    mobile: z.string().optional(),
  }).optional(),
  orderItems: z.array(z.object({
    itemId: z.string(),
    itemName: z.string(),
    qty: z.number(),
    itemPrice: z.number(),
  })),
  orderTotal: z.number().optional(),
  specialInstructions: z.string().optional(),
}).passthrough();

// ==========================================
// Query Schemas
// ==========================================

export const listWebhookLogsQuerySchema = z.object({
  status: z.enum(["RECEIVED", "PROCESSED", "FAILED", "REPLAYED"]).optional(),
  platform: z.enum(["ZOMATO", "SWIGGY"]).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==========================================
// Type Exports
// ==========================================

export type CreateIntegrationConfigInput = z.infer<typeof createIntegrationConfigSchema>;
export type UpdateIntegrationConfigInput = z.infer<typeof updateIntegrationConfigSchema>;
export type CreateMenuMapInput = z.infer<typeof createMenuMapSchema>;
export type UpdateMenuMapInput = z.infer<typeof updateMenuMapSchema>;
export type BulkCreateMenuMapInput = z.infer<typeof bulkCreateMenuMapSchema>;
export type NormalizedOrderItem = z.infer<typeof normalizedOrderItemSchema>;
export type NormalizedOrder = z.infer<typeof normalizedOrderSchema>;
export type ZomatoWebhookPayload = z.infer<typeof zomatoWebhookPayloadSchema>;
export type SwiggyWebhookPayload = z.infer<typeof swiggyWebhookPayloadSchema>;
export type ListWebhookLogsQuery = z.infer<typeof listWebhookLogsQuerySchema>;
