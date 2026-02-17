import type { OrderSource, OrderStatus, OrderType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as repository from "./repository";
import { AppError } from "../../middlewares/error.middleware";
import { updateCustomerStats, updateCustomerCredit } from "../customers/repository";
import { prisma } from "../../utils/prisma";
import type { Prisma } from "@prisma/client";
import { supabaseAdmin } from "../../utils/supabase";

// Input types
export interface CreatePublicOrderInput {
  customer_name: string;
  customer_phone: string;
  table_number?: string;
  notes?: string;
  source: "QR" | "WEB";
  items: { product_id: string; quantity: number; notes?: string }[];
  table_id?: string;
}

export interface CreateInternalOrderInput {
  customer_name?: string;
  customer_phone?: string;
  table_number?: string;
  notes?: string;
  source: "MANUAL" | "ZOMATO" | "SWIGGY";
  items: { product_id: string; quantity: number; notes?: string }[];
  order_type?: OrderType;
  table_id?: string;
  arrive_at?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  cancel_reason?: string;
}

export interface ListOrdersInput {
  status?: OrderStatus;
  from_date?: string;
  to_date?: string;
  page: number;
  limit: number;
}

// ✅ Simplified: No complex status transitions needed
// Orders can only be: ACTIVE → COMPLETED or ACTIVE → CANCELLED

/**
 * Place a public order (no auth, via restaurant slug)
 */
export async function placePublicOrder(
  restaurantSlug: string,
  input: CreatePublicOrderInput
) {
  // Find restaurant by slug (required first)
  const restaurant = await repository.findRestaurantBySlug(restaurantSlug);
  if (!restaurant) {
    throw new AppError("NOT_FOUND", "Restaurant not found", 404);
  }

  // ✅ FIX #7: Parallelize independent queries
  const productIds = input.items.map((i) => i.product_id);

  // Helper to find table by ID or Name/Number
  const getTable = async () => {
    if (!input.table_id) return null;

    // Try finding by UUID first
    if (/^[0-9a-fA-F-]{36}$/.test(input.table_id)) {
      const table = await repository.findTableById(restaurant.id, input.table_id);
      if (table) return table;
    }

    // Fallback: try finding by table number (business logic)
    return repository.findTableByNumber(restaurant.id, input.table_id);
  };

  const [products, table] = await Promise.all([
    repository.findProductsByIds(restaurant.id, productIds),
    getTable(),
  ]);

  // Validate products
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      "VALIDATION_ERROR",
      `Products not available: ${missing.join(", ")}`,
      400
    );
  }

  // Determine table/order details
  let tableId: string | undefined;
  let hallId: string | undefined;
  let resolvedTableNumber = input.table_number;
  let orderType: OrderType = input.source === "QR" ? "DINE_IN" : "TAKEAWAY";

  if (table) {
    tableId = table.id;
    hallId = table.hall_id;
    resolvedTableNumber = table.table_number;
    orderType = "DINE_IN";
  }

  // Upsert customer (can't parallelize - needs to complete before order creation)
  const customer = await repository.upsertCustomer(
    restaurant.tenant_id,
    restaurant.id,
    {
      name: input.customer_name,
      phone: input.customer_phone,
    }
  );

  const order = await repository.createOrder({
    tenant_id: restaurant.tenant_id,
    restaurant_id: restaurant.id,
    table_id: tableId,
    hall_id: hallId,
    customer_id: customer.id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    table_number: resolvedTableNumber,
    notes: input.notes,
    source: input.source as OrderSource,
    order_type: orderType,
    items: input.items,
  });

  // 🔔 Notify waiters/staff of new QR order via Supabase Realtime
  if (input.source === "QR") {
    try {
      await supabaseAdmin.channel(`restaurant:${restaurant.id}:pending-orders`).send({
        type: 'broadcast',
        event: 'new_qr_order',
        payload: {
          order_id: order.id,
          order_number: order.order_number,
          table_number: resolvedTableNumber || 'Unknown',
          customer_name: input.customer_name,
          total_amount: Number(order.total_amount),
          items_count: order.items.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (broadcastError) {
      // Don't fail the order if broadcast fails
      console.error('[QR Order Notification] Failed to broadcast:', broadcastError);
    }
  }

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    placed_at: order.placed_at,
    items: order.items.map((item) => ({
      name: item.name_snapshot,
      quantity: item.quantity,
      price: item.price_snapshot,
    })),
  };
}

/**
 * Create internal order (by staff)
 */
export async function createInternalOrder(
  tenantId: string,
  restaurantId: string,
  input: CreateInternalOrderInput,
  userId?: string
) {
  // ✅ FIX #7: Parallelize independent queries
  const productIds = input.items.map((i) => i.product_id);
  const [products, table] = await Promise.all([
    repository.findProductsByIds(restaurantId, productIds),
    input.table_id
      ? repository.findTableById(restaurantId, input.table_id)
      : Promise.resolve(null)
  ]);

  // Validate products
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      "VALIDATION_ERROR",
      `Products not available: ${missing.join(", ")}`,
      400
    );
  }

  const requestedOrderType: OrderType =
    input.order_type ?? (input.table_id ? "DINE_IN" : "TAKEAWAY");
  let tableId: string | undefined;
  let hallId: string | undefined;

  if (requestedOrderType === "DINE_IN") {
    if (!table) {
      throw new AppError("VALIDATION_ERROR", "Valid table is required for DINE_IN orders", 400);
    }
    tableId = table.id;
    hallId = table.hall_id;
  } else {
    tableId = undefined;
    hallId = undefined;
  }

  const normalizedName = input.customer_name?.trim() || "Guest";
  const normalizedPhone = input.customer_phone?.trim() || "N/A";
  const shouldUpsertCustomer = normalizedPhone !== "N/A";

  const customer = shouldUpsertCustomer
    ? await repository.upsertCustomer(tenantId, restaurantId, {
      name: normalizedName,
      phone: normalizedPhone,
    })
    : null;

  const staff = userId
    ? await repository.findRestaurantStaffByUserId(restaurantId, userId)
    : null;

  const order = await repository.createOrder({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    table_id: tableId,
    hall_id: hallId,
    waiter_id: staff?.id ?? null,
    customer_id: customer?.id ?? null,
    customer_name: normalizedName,
    customer_phone: normalizedPhone,
    table_number: input.table_number,
    notes: input.notes,
    arrive_at: input.arrive_at,
    source: input.source as OrderSource,
    order_type: requestedOrderType,
    items: input.items,
  });

  return order;
}

/**
 * Get order by ID
 */
export async function getOrder(tenantId: string, orderId: string) {
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }
  return order;
}

/**
 * List orders with filters
 */
export async function listOrders(
  tenantId: string,
  restaurantId: string,
  input: ListOrdersInput
) {
  const result = await repository.listOrders({
    tenantId,
    restaurantId,
    status: input.status,
    fromDate: input.from_date ? new Date(input.from_date) : undefined,
    toDate: input.to_date ? new Date(input.to_date) : undefined,
    page: input.page,
    limit: input.limit,
  });

  return {
    orders: result.orders,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  };
}

/**
 * Update order status with validation
 */
export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  input: UpdateOrderStatusInput
) {
  // Get current order
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  // ✅ Simplified validation: Only allow transitions from ACTIVE
  if (order.status === "COMPLETED") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cannot modify a completed order",
      400
    );
  }

  if (order.status === "CANCELLED") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cannot modify a cancelled order",
      400
    );
  }

  // Require cancel reason when cancelling
  if (input.status === "CANCELLED" && !input.cancel_reason) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cancel reason is required when cancelling an order",
      400
    );
  }

  const updated = await repository.updateOrderStatus(
    tenantId,
    orderId,
    input.status,
    input.cancel_reason
  );

  // Update customer stats when order is completed
  if (input.status === "COMPLETED" && order.customer_id && updated) {
    try {
      await updateCustomerStats(
        order.customer_id,
        order.total_amount,
        updated.completed_at || new Date()
      );
    } catch (error) {
      // Log error but don't fail the order update
      console.error("Failed to update customer stats:", error);
    }
  }

  return updated;
}

/**
 * Add items to an existing order (waiter/manager)
 */
export async function addItemsToOrder(
  tenantId: string,
  orderId: string,
  items: { product_id: string; quantity: number; notes?: string }[]
) {
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  // 🔴 Critical Fix #1: Block adding items to completed/cancelled orders
  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    throw new AppError("VALIDATION_ERROR", "Cannot modify a completed/cancelled order", 400);
  }

  // 🔴 Critical Fix #2: Block adding items to PAID orders (Payment Sync Issue)
  if (order.payment_status === "PAID") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cannot add items to a paid order. Please create a new order or request payment adjustment.",
      400
    );
  }

  // ✅ No need to reset status - simplified system

  const updated = await repository.addItemsToOrder(orderId, items, false);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  return updated;
}

/**
 * Update order item quantity/notes
 */
export async function updateOrderItem(
  tenantId: string,
  orderId: string,
  orderItemId: string,
  data: { quantity?: number; notes?: string; status?: string }
) {
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    throw new AppError("VALIDATION_ERROR", "Cannot modify a completed/cancelled order", 400);
  }

  const updated = await repository.updateOrderItem(orderId, orderItemId, data);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Order item not found", 404);
  }

  return updated;
}

/**
 * Remove an item from an order
 */
export async function removeOrderItem(
  tenantId: string,
  orderId: string,
  orderItemId: string
) {
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    throw new AppError("VALIDATION_ERROR", "Cannot modify a completed/cancelled order", 400);
  }

  const updated = await repository.deleteOrderItem(orderId, orderItemId);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Order item not found", 404);
  }

  return updated;
}

/**
 * Get the final bill for a table (open order)
 */
export async function getTableBill(
  tenantId: string,
  restaurantId: string,
  tableId: string
) {
  const order = await repository.findOpenOrderByTable(tenantId, restaurantId, tableId);
  if (!order) {
    throw new AppError("NOT_FOUND", "No open order for this table", 404);
  }

  return {
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    order_type: order.order_type,
    table: order.table,
    hall: order.hall,
    items: order.items,
    total_amount: order.total_amount,
  };
}

/**
 * Get all bills for a day (completed orders)
 */
export async function getDailyBills(
  tenantId: string,
  restaurantId: string,
  date?: string
) {
  const day = date ? new Date(date) : new Date();
  const bills = await repository.listDailyBills(tenantId, restaurantId, day);

  const total = bills.reduce((sum, bill) => sum + Number(bill.total_amount), 0);

  return {
    date: day.toISOString().slice(0, 10),
    total,
    count: bills.length,
    bills: bills.map((o) => ({
      order_id: o.id,
      order_number: o.order_number,
      table: o.table,
      hall: o.hall,
      order_type: o.order_type,
      total_amount: o.total_amount,
      completed_at: o.completed_at,
    })),
  };
}

/**
 * Revenue summary for dashboard (day/week/month)
 */
export async function getRevenueDashboard(
  tenantId: string,
  restaurantId: string
) {
  const now = new Date();

  // Start of Day
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Start of Week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Start of Year
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  // Parallel fetch: Totals, Series data, and Credit metrics
  const [dayMetrics, daySeries, monthSeries, yearSeries, debt, recovery] = await Promise.all([
    repository.getRevenueSummary(tenantId, restaurantId, startOfDay, now),
    repository.getGranularRevenueStats(tenantId, restaurantId, startOfDay, now, 'hourly'),
    repository.getGranularRevenueStats(tenantId, restaurantId, startOfMonth, now, 'daily'),
    repository.getGranularRevenueStats(tenantId, restaurantId, startOfYear, now, 'monthly'),
    repository.getReceivableDebt(tenantId, restaurantId),
    repository.getReceivableRecovery(tenantId, restaurantId, startOfDay, now),
  ]);

  return {
    today: {
      revenue: dayMetrics.revenue,
      cost: dayMetrics.cost,
      profit: dayMetrics.profit,
      orders: dayMetrics.orders,
      date: startOfDay.toISOString().split('T')[0],
      credit_debt: debt,
      credit_recovery: recovery,
    },
    daily: daySeries,
    monthly: monthSeries,
    yearly: yearSeries,
    // Keep week/month keys for backward compatibility if needed, 
    // but the frontend should use the granular ones
    week: monthSeries,
    month: yearSeries,
  };
}

/**
 * Update order payment details
 */
export async function updatePayment(
  tenantId: string,
  orderId: string,
  data: {
    payment_method: string;
    payment_status: string;
    payment_provider?: string;
    payment_reference?: string;
    payment_amount?: number;
    discount_amount?: number;
    paid_at?: string;
  }
) {
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  if (order.status === "CANCELLED") {
    throw new AppError("VALIDATION_ERROR", "Cannot update payment for cancelled order", 400);
  }

  const updated = await repository.updateOrderPayment(orderId, {
    payment_method: data.payment_method,
    payment_status: data.payment_status,
    payment_provider: data.payment_provider,
    payment_reference: data.payment_reference,
    payment_amount: data.payment_amount ? new Decimal(data.payment_amount) : undefined,
    discount_amount: data.discount_amount !== undefined ? new Decimal(data.discount_amount) : undefined,
    paid_at: data.paid_at ? new Date(data.paid_at) : undefined,
  });

  // Handle Customer Credit Balance Sync
  if (order.customer_id) {
    const amount = Number(order.total_amount);
    const wasCredit = order.payment_method === 'CREDIT';
    const isCredit = data.payment_method === 'CREDIT';
    const wasPaid = order.payment_status === 'PAID';
    const isPaid = data.payment_status === 'PAID';

    try {
      // 1. Transition to CREDIT (Pending) -> Increase Debt
      if (!wasCredit && isCredit && !isPaid) {
        await updateCustomerCredit(order.customer_id, amount);
      }
      // 2. Transition from CREDIT (Pending) to PAID -> Decrease Debt (Settled)
      else if (wasCredit && order.payment_status === 'PENDING' && isPaid) {
        await updateCustomerCredit(order.customer_id, -amount);
      }
      // 3. Changing from CREDIT to something else (e.g. CASH) while PENDING -> Decrease Debt
      else if (wasCredit && order.payment_status === 'PENDING' && !isCredit) {
        await updateCustomerCredit(order.customer_id, -amount);
      }
    } catch (error) {
      console.error("Failed to sync customer credit balance:", error);
    }
  }

  return updated;
}

/**
 * Get today's order stats for dashboard
 */
export async function getOrderStats(tenantId: string, restaurantId: string) {
  return repository.getTodayOrdersCount(tenantId, restaurantId);
}

/**
 * Delete an order
 */
export async function deleteOrder(tenantId: string, orderId: string) {
  // Get current order
  const order = await repository.findOrderById(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }

  // Optional: Prevent deletion of completed orders (business rule)
  // Uncomment if you want to prevent deletion of completed orders
  // if (order.status === "COMPLETED") {
  //   throw new AppError(
  //     "VALIDATION_ERROR",
  //     "Cannot delete completed orders",
  //     400
  //   );
  // }

  // If it was a CREDIT order that wasn't paid yet, recover the customer credit balance
  if (order.payment_method === 'CREDIT' && order.payment_status === 'PENDING' && order.customer_id) {
    try {
      await updateCustomerCredit(order.customer_id, -Number(order.total_amount));
    } catch (error) {
      console.error("Failed to recover customer credit on deletion:", error);
    }
  }

  const deleted = await repository.deleteOrder(tenantId, orderId);
  return deleted;
}

/**

/**
 * Get advanced analytics for the dashboard
 */
export async function getAdvancedAnalytics(
  tenantId: string,
  restaurantId: string,
  view: 'daily' | 'monthly' | 'yearly',
  date: string,
  compareWithPrevious: boolean = false
) {
  const targetDate = new Date(date);
  let from: Date;
  let to: Date;
  let timeGroup: 'hour' | 'day' | 'month';

  if (view === 'daily') {
    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();

    if (isToday) {
      // Last 24 hours sliding window
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      to = now;
    } else {
      from = new Date(targetDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(targetDate);
      to.setHours(23, 59, 59, 999);
    }
    timeGroup = 'hour';
  } else if (view === 'monthly') {
    from = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    to = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    timeGroup = 'day';
  } else {
    from = new Date(targetDate.getFullYear(), 0, 1);
    to = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    timeGroup = 'month';
  }

  return repository.getAdvancedAnalytics(tenantId, restaurantId, from, to, timeGroup, compareWithPrevious);
}

/**
 * Get customers with high debt (Udhaar list)
 */
export async function getUdhaarList(tenantId: string, restaurantId: string) {
  // Fetch customers with positive credit balance
  const customers = await prisma.customer.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      credit_balance: { gt: 0 },
    },
    orderBy: {
      credit_balance: 'desc',
    },
    take: 20, // Top 20 high-debt customers
  });

  return customers;
}

/**
 * Settle customer credit
 */
export async function settleCredit(
  tenantId: string,
  restaurantId: string,
  customerId: string,
  amount: number
) {
  if (amount <= 0) {
    throw new AppError("VALIDATION_ERROR", "Settlement amount must be positive", 400);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenant_id: tenantId, restaurant_id: restaurantId },
  });

  if (!customer) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }

  const settleLimit = Number(customer.credit_balance);
  const actualSettleAmount = Math.min(amount, settleLimit);

  if (actualSettleAmount <= 0) {
    return customer;
  }

  // Find oldest pending credit orders to mark as paid
  const pendingOrders = await repository.findPendingCreditOrders(tenantId, restaurantId, customerId);

  let remainingSettleAmount = actualSettleAmount;
  const ordersToMarkPaid: string[] = [];

  for (const order of pendingOrders) {
    const orderAmount = Number(order.total_amount);
    if (remainingSettleAmount >= orderAmount) {
      ordersToMarkPaid.push(order.id);
      remainingSettleAmount -= orderAmount;
    } else {
      break;
    }
  }

  // Execute settlement in a transaction
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Update customer balance
    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        credit_balance: {
          decrement: actualSettleAmount
        }
      }
    });

    // 2. Mark orders as paid
    if (ordersToMarkPaid.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: ordersToMarkPaid } },
        data: {
          payment_status: 'PAID',
          paid_at: new Date()
        }
      });
    }

    // 3. Create audit log
    await tx.auditLog.create({
      data: {
        tenant_id: tenantId,
        action: 'CREDIT_SETTLEMENT',
        entity: 'CUSTOMER',
        entity_id: customerId,
        metadata: {
          amount: actualSettleAmount,
          ordersCount: ordersToMarkPaid.length
        }
      }
    });

    return updatedCustomer;
  });
}

/**
 * Accept a pending QR order
 */
export async function acceptQROrder(
  tenantId: string,
  restaurantId: string,
  orderId: string
) {
  // Verify order exists and belongs to restaurant
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      order_number: true,
      restaurant_id: true,
      tenant_id: true,
      source: true,
      status: true,
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }
  if (order.restaurant_id !== restaurantId || order.tenant_id !== tenantId) {
    throw new AppError("FORBIDDEN", "Access denied to this order", 403);
  }
  if (order.source !== "QR") {
    throw new AppError("VALIDATION_ERROR", "Only QR orders can be accepted", 400);
  }
  if (order.status !== "ACTIVE") {
    throw new AppError("VALIDATION_ERROR", "Order is not in pending state", 400);
  }

  // Order is already active, just confirm acceptance
  // No status change needed since ACTIVE is the correct state

  // Optionally, broadcast acceptance to update UI in real-time
  try {
    await supabaseAdmin.channel(`restaurant:${restaurantId}:pending-orders`).send({
      type: 'broadcast',
      event: 'qr_order_accepted',
      payload: {
        order_id: orderId,
        order_number: order.order_number,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (broadcastError) {
    console.error('[QR Order Acceptance] Failed to broadcast:', broadcastError);
  }

  return order;
}

/**
 * Reject a pending QR order
 */
export async function rejectQROrder(
  tenantId: string,
  restaurantId: string,
  orderId: string,
  reason?: string
) {
  // Verify order exists and belongs to restaurant
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      order_number: true,
      restaurant_id: true,
      tenant_id: true,
      source: true,
      status: true,
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found", 404);
  }
  if (order.restaurant_id !== restaurantId || order.tenant_id !== tenantId) {
    throw new AppError("FORBIDDEN", "Access denied to this order", 403);
  }
  if (order.source !== "QR") {
    throw new AppError("VALIDATION_ERROR", "Only QR orders can be rejected", 400);
  }
  if (order.status !== "ACTIVE") {
    throw new AppError("VALIDATION_ERROR", "Order is not in pending state", 400);
  }

  // Cancel the order
  const updatedOrder = await repository.updateOrderStatus(tenantId, orderId, "CANCELLED", reason);

  // Broadcast rejection to update UI in real-time
  try {
    await supabaseAdmin.channel(`restaurant:${restaurantId}:pending-orders`).send({
      type: 'broadcast',
      event: 'qr_order_rejected',
      payload: {
        order_id: orderId,
        order_number: order.order_number,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (broadcastError) {
    console.error('[QR Order Rejection] Failed to broadcast:', broadcastError);
  }

  return updatedOrder;
}

