import { prisma } from "../../utils/prisma";
import type { OrderStatus, OrderSource, OrderType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

// UUID validation helper
const isValidUuid = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

// Types
export interface CreateOrderData {
  tenant_id: string;
  restaurant_id: string;
  table_id?: string | null;
  hall_id?: string | null;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  table_number?: string;
  notes?: string;
  arrive_at?: string;
  source: OrderSource;
  order_type?: OrderType;
  external_order_id?: string;  // Zomato/Swiggy order ID
  external_metadata?: object;  // Raw webhook payload
  items: {
    product_id: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface OrderWithItems {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  table_id: string | null;
  hall_id: string | null;
  customer_id: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  table_number: string | null;
  external_order_id: string | null;
  external_metadata: Prisma.JsonValue | null;
  notes: string | null;
  total_amount: Prisma.Decimal;
  status: OrderStatus;
  source: OrderSource;
  order_type: OrderType;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_amount: Prisma.Decimal | null;
  paid_at: Date | null;
  placed_at: Date;
  confirmed_at: Date | null;
  preparing_at: Date | null;
  ready_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
  items: {
    id: string;
    product_id: string;
    name_snapshot: string;
    price_snapshot: Prisma.Decimal;
    quantity: number;
    notes: string | null;
  }[];
}

/**
 * Get restaurant by slug (for public order placement)
 */
export async function findRestaurantBySlug(slug: string) {
  return prisma.restaurant.findFirst({
    where: { slug, deleted_at: null },
    select: { id: true, tenant_id: true, name: true },
  });
}

/**
 * Fetch products by IDs for a restaurant
 */
export async function findProductsByIds(
  restaurantId: string,
  productIds: string[]
) {
  return prisma.product.findMany({
    where: {
      id: { in: productIds },
      restaurant_id: restaurantId,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      price: true,
      discount_percent: true,
    },
  });
}

/**
 * Generate a random non-repeating alphanumeric order ID
 * Format: #ORD-[RANDOM][SAME-DIGIT-TWICE]
 * Example: #ORD-A122, #ORD-5V99
 */
async function generateAlphanumericOrderId(
  tx: Prisma.TransactionClient
): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars like I, O, 0, 1
  const digits = "0123456789";

  let orderId = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Generate alphanumeric part (2 chars)
    const randomPart = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    // Generate same digit twice
    const sameDigit = digits[Math.floor(Math.random() * digits.length)] || "0";
    const digitPart = sameDigit + sameDigit;

    orderId = `#ORD-${randomPart}${digitPart}`;

    // Check uniqueness
    const existing = await tx.order.findFirst({
      where: { order_number: orderId },
      select: { id: true },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return orderId;
}

/**
 * Create order with items in a transaction
 * Uses service role (bypasses RLS)
 */
export async function createOrder(
  data: CreateOrderData
): Promise<OrderWithItems> {
  return prisma.$transaction(async (tx) => {
    // Fetch products to snapshot prices (products already validated in service layer)
    // Only re-fetch to ensure not deleted and get latest prices
    const products = await tx.product.findMany({
      where: {
        id: { in: data.items.map((i) => i.product_id) },
        restaurant_id: data.restaurant_id,
        deleted_at: null,
      },
      select: { id: true, name: true, price: true, discount_percent: true, costprice: true },
    });

    // Validate all products still exist
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of data.items) {
      if (!productMap.has(item.product_id)) {
        throw new Error(`Product ${item.product_id} not found or unavailable`);
      }
    }

    // Calculate total (server-side, never trust client)
    const total = data.items.reduce((sum, item) => {
      const product = productMap.get(item.product_id)!;
      const discount = Number(product.discount_percent || 0);
      const discountedPrice = Number(product.price) * (1 - discount / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);

    // Generate unique random alphanumeric order ID
    const orderNumber = await generateAlphanumericOrderId(tx);

    // Create order
    const order = await tx.order.create({
      data: {
        tenant_id: data.tenant_id,
        restaurant_id: data.restaurant_id,
        table_id: data.table_id ?? null,
        hall_id: data.hall_id ?? null,
        customer_id: data.customer_id ?? null,
        order_number: orderNumber,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        table_number: data.table_number,
        notes: data.notes,
        arrive_at: data.arrive_at,
        total_amount: total,
        source: data.source,
        order_type: data.order_type ?? 'DINE_IN',
        status: "PLACED",
        external_order_id: data.external_order_id,
        external_metadata: data.external_metadata as Prisma.InputJsonValue,
        items: {
          create: data.items.map((item) => {
            const product = productMap.get(item.product_id)!;
            const discount = Number(product.discount_percent || 0);
            const discountedPrice = Number(product.price) * (1 - discount / 100);
            return {
              product_id: item.product_id,
              name_snapshot: product.name,
              price_snapshot: discountedPrice,
              cost_snapshot: product.costprice ? Number(product.costprice) : null,
              quantity: item.quantity,
              notes: item.notes,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  }, {
    maxWait: 5000, // Wait max 5s to get transaction slot
    timeout: 10000, // Transaction must complete within 10s
  });
}

export async function upsertCustomer(
  tenantId: string,
  restaurantId: string,
  data: { name: string; phone: string }
) {
  return prisma.customer.upsert({
    where: {
      restaurant_id_phone: {
        restaurant_id: restaurantId,
        phone: data.phone,
      },
    },
    create: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: data.name,
      phone: data.phone,
    },
    update: {
      name: data.name,
    },
  });
}

export async function updateOrderPayment(
  orderId: string,
  data: {
    payment_method: string;
    payment_status: string;
    payment_provider?: string;
    payment_reference?: string;
    payment_amount?: Prisma.Decimal;
    paid_at?: Date | null;
  }
) {
  if (!isValidUuid(orderId)) return null;
  const isPaid = data.payment_status === 'PAID';
  const now = new Date();
  return prisma.order.update({
    where: { id: orderId },
    data: {
      payment_method: data.payment_method as any,
      payment_status: data.payment_status as any,
      payment_provider: data.payment_provider,
      payment_reference: data.payment_reference,
      payment_amount: data.payment_amount,
      paid_at: data.paid_at ?? (isPaid ? now : null),
      // Automatically complete order if paid OR if it's a CREDIT payment
      ...(isPaid || data.payment_method === 'CREDIT' ? {
        status: 'COMPLETED',
        completed_at: now,
      } : {}),
    },
    include: { items: true },
  });
}

/**
 * Get table with hall for a restaurant
 */
export async function findTableById(restaurantId: string, tableId: string) {
  if (!isValidUuid(tableId)) return null;
  return prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurant_id: restaurantId,
      is_active: true,
    },
    include: {
      hall: true,
    },
  });
}

/**
 * Get table by business number for a restaurant
 */
export async function findTableByNumber(restaurantId: string, tableNumber: string) {
  return prisma.restaurantTable.findFirst({
    where: {
      table_number: tableNumber,
      restaurant_id: restaurantId,
      is_active: true,
    },
    include: {
      hall: true,
    },
  });
}

/**
 * Find order by ID with tenant isolation
 */
export async function findOrderById(
  tenantId: string,
  orderId: string
): Promise<OrderWithItems | null> {
  if (!orderId || !isValidUuid(orderId)) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
    },
    include: {
      items: true,
    },
  });
}

export async function findOrderItemById(orderItemId: string) {
  if (!isValidUuid(orderItemId)) return null;
  return prisma.orderItem.findUnique({
    where: { id: orderItemId },
  });
}

export async function addItemsToOrder(
  orderId: string,
  items: Array<{ product_id: string; quantity: number; notes?: string }>,
  shouldResetToPreparing: boolean = false
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    // 🔴 Critical Fix: Check product availability (is_available)
    const products = await tx.product.findMany({
      where: {
        id: { in: items.map((i) => i.product_id) },
        restaurant_id: order.restaurant_id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true, name: true, price: true, discount_percent: true, costprice: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products are available
    for (const item of items) {
      if (!productMap.has(item.product_id)) {
        const productName = await tx.product.findUnique({
          where: { id: item.product_id },
          select: { name: true, is_available: true }
        });

        if (productName && !productName.is_available) {
          throw new Error(`Product "${productName.name}" is currently out of stock`);
        }
        throw new Error(`Product ${item.product_id} not found or unavailable`);
      }
    }

    const newItemsTotal = items.reduce((sum, item) => {
      const product = productMap.get(item.product_id)!;
      const discount = Number(product.discount_percent || 0);
      const discountedPrice = Number(product.price) * (1 - discount / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);

    const existingTotal = order.items.reduce((sum, item) => {
      return sum + Number(item.price_snapshot) * item.quantity;
    }, 0);

    // 🟡 Important Fix: Auto-reset status to PREPARING if needed
    const statusUpdate = shouldResetToPreparing ? {
      status: 'PREPARING' as const,
      preparing_at: new Date()
    } : {};

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        total_amount: existingTotal + newItemsTotal,
        ...statusUpdate, // Reset status if order was READY/SERVED
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.product_id)!;
            const discount = Number(product.discount_percent || 0);
            const discountedPrice = Number(product.price) * (1 - discount / 100);
            return {
              product_id: item.product_id,
              name_snapshot: product.name,
              price_snapshot: discountedPrice,
              cost_snapshot: product.costprice ? Number(product.costprice) : null,
              quantity: item.quantity,
              notes: item.notes,
              status: "REORDER" // 🟢 New items from reorder get REORDER status
            };
          }),
        },
      },
      include: { items: true },
    });

    return updated;
  }, {
    maxWait: 5000,
    timeout: 15000, // 🟢 Increased timeout from 10s to 15s
  });
}

export async function updateOrderItem(
  orderId: string,
  orderItemId: string,
  data: { quantity?: number; notes?: string; status?: string }
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return null;

    const item = order.items.find((i) => i.id === orderItemId);
    if (!item) return null;

    // 🔴 Lock if item is already served
    if (item.status === 'SERVED' && data.status && data.status !== 'SERVED') {
      throw new Error("This item is already served and locked.");
    }

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        quantity: data.quantity ?? item.quantity,
        notes: data.notes ?? item.notes,
        status: data.status ?? item.status,
      },
    });

    const updatedItems = await tx.orderItem.findMany({
      where: { order_id: orderId },
    });

    const total = updatedItems.reduce((sum, i) => {
      return sum + Number(i.price_snapshot) * i.quantity;
    }, 0);

    return tx.order.update({
      where: { id: orderId },
      data: { total_amount: total },
      include: { items: true },
    });
  });
}

export async function deleteOrderItem(
  orderId: string,
  orderItemId: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return null;

    const item = order.items.find((i) => i.id === orderItemId);
    if (!item) return null;

    await tx.orderItem.delete({ where: { id: orderItemId } });

    const updatedItems = await tx.orderItem.findMany({
      where: { order_id: orderId },
    });

    const total = updatedItems.reduce((sum, i) => {
      return sum + Number(i.price_snapshot) * i.quantity;
    }, 0);

    return tx.order.update({
      where: { id: orderId },
      data: { total_amount: total },
      include: { items: true },
    });
  });
}

export async function listDailyBills(
  tenantId: string,
  restaurantId: string,
  date: Date
) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: 'COMPLETED',
      completed_at: { gte: start, lte: end },
    },
    include: {
      items: true,
      table: true,
      hall: true,
    },
    orderBy: { completed_at: 'desc' },
  });
}

export async function findOpenOrderByTable(
  tenantId: string,
  restaurantId: string,
  tableId: string
) {
  return prisma.order.findFirst({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      table_id: tableId,
      status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] },
    },
    include: {
      items: true,
      table: true,
      hall: true,
    },
    orderBy: { placed_at: 'desc' },
  });
}

/**
 * Get revenue summary with real cost and profit calculations
 */
export async function getRevenueSummary(
  tenantId: string,
  restaurantId: string,
  from: Date,
  to: Date
) {
  const orders = await prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: 'COMPLETED',
      payment_status: 'PAID',
      completed_at: { gte: from, lte: to },
    },
    include: {
      items: true
    }
  });

  let totalRevenue = 0;
  let totalCost = 0;

  orders.forEach(order => {
    totalRevenue += Number(order.total_amount);
    order.items.forEach(item => {
      // Use cost_snapshot if available, otherwise fallback to 0
      const costAtOrderTime = item.cost_snapshot ? Number(item.cost_snapshot) : 0;
      totalCost += costAtOrderTime * item.quantity;
    });
  });

  return {
    revenue: totalRevenue.toString(),
    cost: totalCost.toString(),
    profit: (totalRevenue - totalCost).toString(),
    orders: orders.length
  };
}

/**
 * Get total outstanding debt (Customer Credits + Completed Orders with Pending Payment)
 */
export async function getReceivableDebt(tenantId: string, restaurantId: string) {
  const [customerDebt, pendingOrders] = await Promise.all([
    prisma.customer.aggregate({
      where: {
        tenant_id: tenantId,
        restaurant_id: restaurantId,
      },
      _sum: {
        credit_balance: true
      }
    }),
    prisma.order.aggregate({
      where: {
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        status: 'COMPLETED',
        payment_status: 'PENDING',
        payment_method: { not: 'CREDIT' }
      },
      _sum: {
        total_amount: true
      }
    })
  ]);

  return Number(customerDebt._sum.credit_balance || 0) + Number(pendingOrders._sum.total_amount || 0);
}

/**
 * Get total amount collected from credit orders in a given period (Receivable Recovery)
 */
export async function getReceivableRecovery(
  tenantId: string,
  restaurantId: string,
  from: Date,
  to: Date
) {
  const result = await prisma.order.aggregate({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      payment_method: 'CREDIT',
      payment_status: 'PAID',
      paid_at: { gte: from, lte: to },
    },
    _sum: {
      total_amount: true
    }
  });
  return Number(result._sum.total_amount || 0);
}

/**
 * Get revenue and order stats aggregated by dynamic granularity
 */
export async function getGranularRevenueStats(
  tenantId: string,
  restaurantId: string,
  from: Date,
  to: Date,
  granularity: 'hourly' | 'daily' | 'monthly'
) {
  const orders = await prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: 'COMPLETED',
      payment_status: 'PAID',
      completed_at: { gte: from, lte: to },
    },
    select: {
      completed_at: true,
      total_amount: true,
    }
  });

  const grouped: Record<string, { revenue: number, orders: number }> = {};

  orders.forEach(o => {
    if (!o.completed_at) return;

    let key = "";
    const date = o.completed_at;

    if (granularity === 'hourly') {
      key = date.toISOString().split(':')[0]! + ":00"; // YYYY-MM-DDTHH:00
    } else if (granularity === 'monthly') {
      key = date.toISOString().slice(0, 7); // YYYY-MM
    } else {
      key = date.toISOString().split('T')[0]!; // YYYY-MM-DD
    }

    const current = grouped[key] || { revenue: 0, orders: 0 };
    current.revenue += Number(o.total_amount);
    current.orders += 1;
    grouped[key] = current;
  });

  return Object.entries(grouped).map(([time, data]) => ({
    time,
    revenue: data.revenue.toString(),
    orders: data.orders
  })).sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Get revenue aggregated by day for a time range (deprecated: use getGranularRevenueStats)
 */
export async function getDailyRevenueStats(
  tenantId: string,
  restaurantId: string,
  from: Date,
  to: Date
) {
  return getGranularRevenueStats(tenantId, restaurantId, from, to, 'daily');
}

/**
 * List orders with filters
 */
export async function listOrders(params: {
  tenantId: string;
  restaurantId: string;
  status?: OrderStatus;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}): Promise<{ orders: OrderWithItems[]; total: number }> {
  const where: Prisma.OrderWhereInput = {
    tenant_id: params.tenantId,
    restaurant_id: params.restaurantId,
  };

  if (params.status) {
    where.status = params.status;
  }

  if (params.fromDate || params.toDate) {
    where.placed_at = {};
    if (params.fromDate) where.placed_at.gte = params.fromDate;
    if (params.toDate) where.placed_at.lte = params.toDate;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { placed_at: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
}

/**
 * Update order status with timestamp tracking
 */
export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  newStatus: OrderStatus,
  cancelReason?: string
): Promise<OrderWithItems | null> {
  if (!isValidUuid(orderId)) return null;
  // First verify ownership
  const existing = await prisma.order.findFirst({
    where: { id: orderId, tenant_id: tenantId },
    select: { id: true, status: true },
  });

  if (!existing) return null;

  // Build update data with appropriate timestamp
  const updateData: Prisma.OrderUpdateInput = { status: newStatus };

  switch (newStatus) {
    case "CONFIRMED":
      updateData.confirmed_at = new Date();
      break;
    case "PREPARING":
      updateData.preparing_at = new Date();
      break;
    case "READY":
      updateData.ready_at = new Date();
      break;
    case "COMPLETED":
      updateData.completed_at = new Date();
      break;
    case "CANCELLED":
      updateData.cancelled_at = new Date();
      updateData.cancel_reason = cancelReason;
      break;
  }

  // Update items status if order is being SERVED
  if (newStatus === "SERVED") {
    await prisma.orderItem.updateMany({
      where: { order_id: orderId },
      data: { status: "SERVED" }
    });
  }

  // Validate all items are served before completing
  if (newStatus === "COMPLETED") {
    const unservedItems = await prisma.orderItem.findMany({
      where: {
        order_id: orderId,
        status: { not: "SERVED" }
      }
    });

    if (unservedItems.length > 0) {
      const itemNames = unservedItems.map(i => i.name_snapshot).join(", ");
      throw new Error(`Order cannot be completed. Items not served yet: ${itemNames}`);
    }
  }

  return prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: { items: true },
  });
}

/**
 * Get today's orders count for a restaurant (for dashboard stats)
 */
export async function getTodayOrdersCount(
  tenantId: string,
  restaurantId: string
): Promise<{ total: number; byStatus: Record<OrderStatus, number> }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const orders = await prisma.order.groupBy({
    by: ["status"],
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      placed_at: { gte: today },
    },
    _count: { id: true },
  });

  const byStatus = orders.reduce(
    (acc, o) => {
      acc[o.status] = o._count.id;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );

  const total = orders.reduce((sum: number, o) => sum + o._count.id, 0);

  return { total, byStatus };
}

/**
 * Find order by external order ID (for idempotency check)
 */
export async function findOrderByExternalId(
  source: OrderSource,
  externalOrderId: string
): Promise<OrderWithItems | null> {
  return prisma.order.findFirst({
    where: {
      source,
      external_order_id: externalOrderId,
    },
    include: { items: true },
  });
}

/**
 * Delete an order (soft delete or hard delete based on business rules)
 */
export async function deleteOrder(
  tenantId: string,
  orderId: string
): Promise<OrderWithItems | null> {
  if (!isValidUuid(orderId)) return null;
  // First verify ownership
  const existing = await prisma.order.findFirst({
    where: { id: orderId, tenant_id: tenantId },
    include: { items: true },
  });

  if (!existing) return null;

  // Hard delete the order (cascade will delete order items)
  return prisma.order.delete({
    where: { id: orderId },
    include: { items: true },
  });
}

/**
 * Find orders for settlement (PENDING and CREDIT)
 */
export async function findPendingCreditOrders(tenantId: string, restaurantId: string, customerId: string) {
  return prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      customer_id: customerId,
      payment_method: 'CREDIT',
      payment_status: 'PENDING',
      status: 'COMPLETED',
    },
    orderBy: {
      placed_at: 'asc',
    },
  });
}

/**
 * Update multiple orders as paid during settlement
 */
export async function markOrdersAsPaid(orderIds: string[], paidAt: Date) {
  return prisma.order.updateMany({
    where: {
      id: { in: orderIds },
    },
    data: {
      payment_status: 'PAID',
      paid_at: paidAt,
    },
  });
}

/**
 * Get advanced analytics data for given period
 */
export async function getAdvancedAnalytics(
  tenantId: string,
  restaurantId: string,
  from: Date,
  to: Date,
  timeGroup: 'hour' | 'day' | 'month'
) {
  // 1. Revenue & Orders Trend
  // Note: Prisma doesn't support grouping by date parts directly in cross-DB way easily without raw SQL
  // but for PostgreSQL we can use raw query or fetch and group in JS. 
  // Given we are using PostgreSQL (Postgresql), we'll use a raw query for performance.

  const truncOp = timeGroup === 'hour' ? 'hour' : timeGroup === 'day' ? 'day' : 'month';

  const stats: any[] = await prisma.$queryRaw`
    SELECT 
      date_trunc(${truncOp}, "completed_at") as period,
      SUM("total_amount") as revenue,
      COUNT("id") as orders
    FROM "orders"
    WHERE 
      "tenant_id" = ${tenantId}::uuid AND 
      "restaurant_id" = ${restaurantId}::uuid AND 
      "status" = 'COMPLETED' AND 
      "payment_status" = 'PAID' AND
      "completed_at" >= ${from} AND 
      "completed_at" <= ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  // 2. Market Distribution (Category-wise Sales)
  const categorySales: any[] = await prisma.$queryRaw`
    SELECT 
      c.name,
      SUM(oi.price_snapshot * oi.quantity) as total
    FROM "order_items" oi
    JOIN "Product" p ON oi.product_id = p.id
    JOIN "Category" c ON p.category_id = c.id
    JOIN "orders" o ON oi.order_id = o.id
    WHERE 
      o.tenant_id = ${tenantId}::uuid AND 
      o.restaurant_id = ${restaurantId}::uuid AND 
      o.status = 'COMPLETED' AND 
      o.payment_status = 'PAID' AND
      o.completed_at >= ${from} AND 
      o.completed_at <= ${to}
    GROUP BY c.name
    ORDER BY total DESC
  `;

  // 3. Product Performance (Top selling items)
  const productSales: any[] = await prisma.$queryRaw`
    SELECT 
      p.name,
      SUM(oi.quantity) as quantity,
      SUM(oi.price_snapshot * oi.quantity) as revenue
    FROM "order_items" oi
    JOIN "Product" p ON oi.product_id = p.id
    JOIN "orders" o ON oi.order_id = o.id
    WHERE 
      o.tenant_id = ${tenantId}::uuid AND 
      o.restaurant_id = ${restaurantId}::uuid AND 
      o.status = 'COMPLETED' AND 
      o.payment_status = 'PAID' AND
      o.completed_at >= ${from} AND 
      o.completed_at <= ${to}
    GROUP BY p.name
    ORDER BY quantity DESC
    LIMIT 20
  `;

  // 4. Receivable Debt (Outstanding Credits)
  const outstandingDebts = await prisma.customer.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      credit_balance: { gt: 0 }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      credit_balance: true
    },
    orderBy: {
      credit_balance: 'desc'
    },
    take: 5
  });

  // Calculate real cost and profit using cost_snapshot from order items
  const totalRevenue = stats.reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const totalOrders = stats.reduce((acc, curr) => acc + Number(curr.orders), 0);

  // Fetch all completed orders with items to calculate actual cost
  const ordersWithItems = await prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: 'COMPLETED',
      payment_status: 'PAID',
      completed_at: { gte: from, lte: to }
    },
    include: {
      items: true
    }
  });

  // Calculate total cost from cost_snapshot of each order item
  let totalCost = 0;
  ordersWithItems.forEach(order => {
    order.items.forEach(item => {
      // Use cost_snapshot if available, otherwise fallback to 0
      const costAtOrderTime = item.cost_snapshot ? Number(item.cost_snapshot) : 0;
      totalCost += costAtOrderTime * item.quantity;
    });
  });

  // Real profit = Revenue - Cost
  const totalProfit = totalRevenue - totalCost;

  return {
    trends: stats.map(s => ({
      period: s.period,
      revenue: Number(s.revenue),
      orders: Number(s.orders)
    })),
    distribution: categorySales.map(c => ({
      name: c.name,
      value: Number(c.total)
    })),
    products: productSales.map(p => ({
      name: p.name,
      quantity: Number(p.quantity),
      revenue: Number(p.revenue)
    })),
    debts: outstandingDebts.map(d => ({
      id: d.id,
      customer: d.name,
      phone: d.phone,
      amount: Number(d.credit_balance)
    })),
    metrics: {
      totalRevenue,
      totalOrders,
      totalCost,      // Real cost from cost_snapshot
      totalProfit     // Real profit (revenue - cost)
    }
  };
}

/**
 * Find pending credit orders for a customer (oldest first)
 */
export async function findPendingCreditOrders(
  tenantId: string,
  restaurantId: string,
  customerId: string
) {
  return prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      customer_id: customerId,
      status: 'COMPLETED',
      payment_method: 'CREDIT',
      payment_status: 'PENDING'
    },
    orderBy: {
      completed_at: 'asc'
    }
  });
}
