import { z } from "zod";

// Order item schema for creating orders
export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().max(200).optional(),
});

// Public order creation (no auth required)
export const createPublicOrderSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
  table_number: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1).max(50),
  source: z.enum(["QR", "WEB"]).default("QR"),
  table_id: z.string().optional(),
});

// Internal order creation (by staff)
export const createInternalOrderSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
  table_number: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1).max(50),
  source: z.enum(["MANUAL", "ZOMATO", "SWIGGY"]).default("MANUAL"),
  order_type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  table_id: z.string().uuid().optional(),
  arrive_at: z.string().optional(),
});

// Update payment details
export const updatePaymentSchema = z.object({
  payment_method: z.enum(["CASH", "CARD", "UPI", "CREDIT", "GPAY", "APPLE_PAY", "OTHER"]),
  payment_status: z.enum(["PENDING", "PAID"]).default("PAID"),
  payment_provider: z.string().max(100).optional(),
  payment_reference: z.string().max(200).optional(),
  payment_amount: z.number().positive().optional(),
  paid_at: z.string().datetime().optional(),
});

// Update order status
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY",
    "SERVED",
    "COMPLETED",
    "CANCELLED",
  ]),
  cancel_reason: z.string().max(500).optional(),
});

// Query params for listing orders
export const listOrdersQuerySchema = z.object({
  status: z
    .enum(["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
    .optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Add items to an existing order
export const addOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
});

// Update an existing order item
export const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(200).optional(),
  status: z.string().optional(),
});

// Bill query (optional date override)
export const billsQuerySchema = z.object({
  date: z.string().datetime().optional(),
});

export type CreatePublicOrderInput = z.infer<typeof createPublicOrderSchema>;
export type CreateInternalOrderInput = z.infer<typeof createInternalOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type BillsQuery = z.infer<typeof billsQuerySchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
