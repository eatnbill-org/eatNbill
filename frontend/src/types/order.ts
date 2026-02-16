/**
 * Order Domain Types
 * Phase 4: Orders & Order Lifecycle
 *
 * These types match the backend Prisma schema and API responses.
 */

// ============================================================
// ORDER ENUMS
// ============================================================

export type OrderStatus =
  | 'ACTIVE'       // Order is ongoing, table is occupied
  | 'COMPLETED'    // Payment done, table is free
  | 'CANCELLED';   // Order was cancelled

export type OrderSource =
  | 'QR'       // QR code scan
  | 'WEB'      // Web ordering
  | 'MANUAL'   // Staff-created
  | 'ZOMATO'   // Zomato integration
  | 'SWIGGY';  // Swiggy integration

export type OrderType =
  | 'DINE_IN'
  | 'TAKEAWAY'
  | 'DELIVERY';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'UPI'
  | 'CREDIT'
  | 'GPAY'
  | 'APPLE_PAY'
  | 'OTHER';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID';

// ============================================================
// ORDER ITEM TYPES
// ============================================================

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;      // Product name at time of order
  price_snapshot: string;     // Product price at time of order (Decimal as string)
  cost_snapshot?: string | null;  // Product cost at time of order (for profit calculation)
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ORDER TYPES
// ============================================================

export interface Order {
  // Identifiers
  id: string;
  tenant_id: string;
  restaurant_id: string;
  table_id: string | null;
  hall_id: string | null;
  customer_id: string | null;

  // Order Info
  order_number: string;
  customer_name: string;
  customer_phone: string;
  table_number: string | null;
  notes: string | null;
  total_amount: string;  // Decimal as string

  // Status & Lifecycle
  status: OrderStatus;
  source: OrderSource;
  order_type: OrderType;

  // Payment
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_amount: string | null;  // Decimal as string
  paid_at: string | null;

  // External Integration
  external_order_id: string | null;
  external_metadata: unknown;

  // Timestamps
  placed_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  arrive_at: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  items: OrderItem[];
}

// ============================================================
// API PAYLOADS
// ============================================================

export interface CreatePublicOrderPayload {
  customer_name: string;
  customer_phone: string;
  table_number?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
  }>;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  table_id?: string;
  table_number?: string;
  order_type: OrderType;
  notes?: string;
  arrive_at?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
  }>;
  // Note: source is NOT included - backend defaults to 'MANUAL' for internal orders
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  cancel_reason?: string;
}

export interface UpdatePaymentPayload {
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_provider?: string;
  payment_reference?: string;
  payment_amount?: number;
}

export interface AddOrderItemsPayload {
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
  }>;
}

export interface UpdateOrderItemPayload {
  quantity?: number;
  notes?: string;
}

// ============================================================
// KDS TYPES
// ============================================================

export interface KdsSettings {
  id: string;
  restaurant_id: string;
  sound_enabled: boolean;
  auto_clear_completed_after_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateKdsSettingsPayload {
  sound_enabled?: boolean;
  auto_clear_completed_after_seconds?: number;
}

export interface KdsDashboard {
  orders: Order[];
  counts: {
    placed: number;
    confirmed: number;
    preparing: number;
    ready: number;
  };
  settings: KdsSettings;
  serverTime: string;
}

export interface KdsRealtimeConfig {
  channel: string;
  table: string;
  schema: string;
  filter: string;
  events: string[];
}

// ============================================================
// FILTER & QUERY TYPES
// ============================================================

export interface OrderFilters {
  status?: OrderStatus;
  source?: OrderSource;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface OrderStats {
  total: number;
  byStatus: Record<OrderStatus, number>; // Backend uses byStatus, not by_status
}

export interface RevenueData {
  date: string;
  revenue: string;  // Decimal as string
  orders: number;
  credit_debt?: number;
  credit_recovery?: number;
}

export interface RevenueSummary {
  today: RevenueData;
  week: RevenueData[];
  month: RevenueData[];
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiError {
  code: string;
  message: string;
}

export interface OrderListResponse {
  data: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrderResponse {
  data: Order;
}

export interface OrderStatsResponse {
  data: OrderStats;
}

export interface RevenueSummaryResponse {
  data: RevenueSummary;
}

export interface UdhaarListResponse {
  data: Array<{
    id: string;
    name: string;
    phone: string;
    credit_balance: string | number;
  }>;
}

export interface SettleCreditPayload {
  customer_id: string;
  amount: number;
}

export interface KdsDashboardResponse {
  data: KdsDashboard;
}

export interface KdsRealtimeConfigResponse {
  data: KdsRealtimeConfig;
}

// ============================================================
// REALTIME EVENT TYPES
// ============================================================

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = Order> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: RealtimeEvent;
  new: T;
  old: Partial<T>;
  errors: string[] | null;
}

export interface RealtimeOrderUpdate {
  eventType: RealtimeEvent;
  order: Order;
  oldOrder?: Partial<Order>;
}

// ============================================================
// STATE MACHINE HELPERS
// ============================================================

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],  // Terminal state
  CANCELLED: [],  // Terminal state
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['ACTIVE'];

export const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status);
}
