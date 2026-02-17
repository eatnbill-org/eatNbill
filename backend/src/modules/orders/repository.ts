import { prisma } from "../../utils/prisma";
import type { OrderStatus, OrderSource, OrderType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

// UUID validation helper
const isValidUuid = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
// Only ACTIVE orders are considered active for dine-in (as per schema: ACTIVE, COMPLETED, CANCELLED)
const ACTIVE_DINE_IN_STATUSES: OrderStatus[] = ["ACTIVE"];

// Types
export interface CreateOrderData {
  tenant_id: string;
  restaurant_id: string;
  table_id?: string | null;
  hall_id?: string | null;
  waiter_id?: string | null;
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
        waiter_id: data.waiter_id ?? null,
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
        status: "ACTIVE",
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

    if (order.order_type === "DINE_IN" && order.table_id) {
      await tx.restaurantTable.update({
        where: { id: order.table_id },
        data: { table_status: "OCCUPIED" },
      });
    }

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
    discount_amount?: Prisma.Decimal; // New field
    paid_at?: Date | null;
  }
) {
  if (!isValidUuid(orderId)) return null;

  // Fetch order to calculate subtotal if discount is applied
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) return null;

  let newTotal = order.total_amount;

  // Recalculate total if discount is being updated
  if (data.discount_amount !== undefined) {
    const subtotal = order.items.reduce((sum, item) => sum + Number(item.price_snapshot) * item.quantity, 0);
    const discount = Number(data.discount_amount);

    if (discount > subtotal) {
      throw new Error("Discount cannot exceed order total");
    }

    newTotal = new Prisma.Decimal(subtotal - discount);
  }

  const isPaid = data.payment_status === 'PAID';
  const now = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      payment_method: data.payment_method as any,
      payment_status: data.payment_status as any,
      payment_provider: data.payment_provider,
      payment_reference: data.payment_reference,
      payment_amount: data.payment_amount,
      discount_amount: data.discount_amount, // Persist discount
      total_amount: newTotal,                // Update final total
      paid_at: data.paid_at ?? (isPaid ? now : null),
      // Automatically complete order if paid OR if it's a CREDIT payment
      ...(isPaid || data.payment_method === 'CREDIT' ? {
        status: 'COMPLETED',
        completed_at: now,
      } : {}),
    },
    include: { items: true },
  });

  if (updated.table_id) {
    await syncTableStatus(updated.table_id);
  }

  return updated;
}

export async function findRestaurantStaffByUserId(restaurantId: string, userId: string) {
  if (!isValidUuid(restaurantId) || !isValidUuid(userId)) return null;
  return prisma.restaurantUser.findFirst({
    where: {
      restaurant_id: restaurantId,
      user_id: userId,
      is_active: true,
      role: { in: ["OWNER", "MANAGER", "WAITER"] },
    },
    select: { id: true },
  });
}

export async function syncTableStatus(tableId: string) {
  if (!isValidUuid(tableId)) return;

  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { id: true, table_status: true },
  });

  if (!table) return;

  const activeCount = await prisma.order.count({
    where: {
      table_id: tableId,
      order_type: "DINE_IN",
      status: { in: ACTIVE_DINE_IN_STATUSES },
    },
  });

  if (activeCount > 0) {
    if (table.table_status !== "OCCUPIED") {
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { table_status: "OCCUPIED" },
      });
    }
    return;
  }

  if (table.table_status === "RESERVED") {
    return;
  }

  if (table.table_status !== "AVAILABLE") {
    await prisma.restaurantTable.update({
      where: { id: tableId },
      data: { table_status: "AVAILABLE" },
    });
  }
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
      table: true,
      hall: true,
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

    // 🟡 Important Fix: Auto-reset status to ACTIVE if order was completed
    const statusUpdate = shouldResetToPreparing ? {
      status: 'ACTIVE' as const,
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
      status: 'ACTIVE', // ✅ Simplified: Only ACTIVE orders are "open"
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
  // Optimized: Single DB round-trip with aggregation
  const result: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(o.total_amount), 0.00) as revenue,
      COUNT(DISTINCT o.id) as orders,
      COALESCE(SUM(CASE 
        WHEN oi.cost_snapshot IS NOT NULL THEN oi.cost_snapshot * oi.quantity
        ELSE 0.00 
      END), 0.00) as cost
    FROM "orders" o
    LEFT JOIN "order_items" oi ON o.id = oi.order_id
    WHERE 
      o.tenant_id = ${tenantId}::uuid AND 
      o.restaurant_id = ${restaurantId}::uuid AND 
      o.status = 'COMPLETED' AND 
      o.payment_status = 'PAID' AND
      o.completed_at >= ${from} AND 
      o.completed_at <= ${to}
  `;

  const stats = result[0] || { revenue: 0, cost: 0, orders: 0 };
  const revenue = Number(stats.revenue || 0);
  const cost = Number(stats.cost || 0);

  return {
    revenue: revenue.toString(),
    cost: cost.toString(),
    profit: (revenue - cost).toString(),
    orders: Number(stats.orders || 0)
  };
}

/**
 * Get total outstanding debt (Customer Credits + Completed Orders with Pending Payment)
 */
export async function getReceivableDebt(tenantId: string, restaurantId: string) {
  // Optimized: Single DB query to fetch both metrics
  const result: any[] = await prisma.$queryRaw`
    SELECT 
      (
        SELECT COALESCE(SUM(credit_balance), 0.00)
        FROM "customers"
        WHERE tenant_id = ${tenantId}::uuid AND restaurant_id = ${restaurantId}::uuid
      ) as customer_debt,
      (
        SELECT COALESCE(SUM(total_amount), 0.00)
        FROM "orders"
        WHERE 
          tenant_id = ${tenantId}::uuid AND 
          restaurant_id = ${restaurantId}::uuid AND 
          status = 'COMPLETED' AND 
          payment_status = 'PENDING' AND 
          payment_method != 'CREDIT'
      ) as pending_orders
  `;

  const stats = result[0] || { customer_debt: 0, pending_orders: 0 };
  return Number(stats.customer_debt || 0) + Number(stats.pending_orders || 0);
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
  const truncOp = granularity === 'hourly' ? 'hour' : granularity === 'daily' ? 'day' : 'month';

  // Optimized: Group by time bucket in DB
  const rawStats: any[] = await prisma.$queryRaw`
    SELECT 
      date_trunc(${truncOp}, "completed_at") as time,
      COALESCE(SUM("total_amount"), 0.00) as revenue,
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

  // Zero-Filling Logic
  const filledStats: { time: string; revenue: string; orders: number }[] = [];
  const current = new Date(from);

  // Align current to start of bucket
  if (granularity === 'hourly') current.setMinutes(0, 0, 0);
  else if (granularity === 'daily') current.setHours(0, 0, 0, 0);
  else { // monthly
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
  }

  // Create lookup map
  const statsMap = new Map();
  rawStats.forEach(s => {
    // rawStats time is usually Date object from Prisma
    const timeVal = new Date(s.time).getTime();
    if (!isNaN(timeVal)) {
      statsMap.set(timeVal, s);
    }
  });

  const generateLabel = (date: Date): string => {
    if (granularity === 'hourly') return date.toISOString().slice(0, 13) + ":00";
    if (granularity === 'monthly') return date.toISOString().slice(0, 7);
    return date.toISOString().split('T')[0] || date.toISOString().slice(0, 10);
  };

  while (current <= to) {
    const timeKey = current.getTime();
    const existing = statsMap.get(timeKey);

    filledStats.push({
      time: generateLabel(current),
      revenue: existing ? Number(existing.revenue).toString() : "0",
      orders: existing ? Number(existing.orders) : 0
    });

    // Increment
    if (granularity === 'hourly') current.setHours(current.getHours() + 1);
    else if (granularity === 'daily') current.setDate(current.getDate() + 1);
    else current.setMonth(current.getMonth() + 1);
  }

  return filledStats;
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
      include: {
        items: true,
        table: true,
        hall: true,
      },
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

  if (newStatus === "COMPLETED") {
    updateData.completed_at = new Date();
  } else if (newStatus === "CANCELLED") {
    updateData.cancelled_at = new Date();
    updateData.cancel_reason = cancelReason;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: { items: true },
  });

  if (updated.table_id) {
    await syncTableStatus(updated.table_id);
  }

  return updated;
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
  const deleted = await prisma.order.delete({
    where: { id: orderId },
    include: { items: true },
  });

  if (deleted.table_id) {
    await syncTableStatus(deleted.table_id);
  }

  return deleted;
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
  timeGroup: 'hour' | 'day' | 'month',
  compareWithPrevious: boolean = false
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

  // --- RECONSTRUCT TRENDS WITH ZERO-FILLING ---
  const trends: any[] = [];
  let current = new Date(from);

  // Align current to start of its period
  if (timeGroup === 'hour') current.setMinutes(0, 0, 0);
  else if (timeGroup === 'day') current.setHours(0, 0, 0, 0);
  else if (timeGroup === 'month') {
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
  }

  // Use a map for O(1) lookup of existing stats
  const statsMap = new Map(
    stats.map(s => [new Date(s.period).getTime(), s])
  );

  while (current <= to) {
    const time = current.getTime();
    const existing = statsMap.get(time);

    trends.push({
      period: current.toISOString(),
      revenue: existing ? Number(existing.revenue) : 0,
      orders: existing ? Number(existing.orders) : 0
    });

    if (timeGroup === 'hour') {
      current.setHours(current.getHours() + 1);
    } else if (timeGroup === 'day') {
      current.setDate(current.getDate() + 1);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  // Optimized: Calculate total cost using SQL aggregation instead of loop
  const costResult: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(CASE 
        WHEN oi.cost_snapshot IS NOT NULL THEN oi.cost_snapshot * oi.quantity
        ELSE 0.00 
      END), 0.00) as total_cost
    FROM "orders" o
    JOIN "order_items" oi ON o.id = oi.order_id
    WHERE 
      o.tenant_id = ${tenantId}::uuid AND 
      o.restaurant_id = ${restaurantId}::uuid AND 
      o.status = 'COMPLETED' AND 
      o.payment_status = 'PAID' AND
      o.completed_at >= ${from} AND 
      o.completed_at <= ${to}
  `;

  const totalCost = Number(costResult[0]?.total_cost || 0);

  // Real profit = Revenue - Cost
  const totalProfit = totalRevenue - totalCost;

  // 5. Payment Method Breakdown
  const paymentMethods: any[] = await prisma.$queryRaw`
    SELECT 
      "payment_method" as method,
      COUNT("id") as count,
      SUM("total_amount") as amount
    FROM "orders"
    WHERE 
      "tenant_id" = ${tenantId}::uuid AND 
      "restaurant_id" = ${restaurantId}::uuid AND 
      "status" = 'COMPLETED' AND 
      "payment_status" = 'PAID' AND
      "completed_at" >= ${from} AND 
      "completed_at" <= ${to}
    GROUP BY "payment_method"
    ORDER BY amount DESC
  `;

  // 6. Period Comparison (if requested)
  let comparison = null;
  if (compareWithPrevious) {
    const periodDuration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodDuration);
    const prevTo = new Date(from.getTime() - 1000); // 1 second before current period starts

    const prevStats: any[] = await prisma.$queryRaw`
      SELECT 
        SUM("total_amount") as revenue,
        COUNT("id") as orders
      FROM "orders"
      WHERE 
        "tenant_id" = ${tenantId}::uuid AND 
        "restaurant_id" = ${restaurantId}::uuid AND 
        "status" = 'COMPLETED' AND 
        "payment_status" = 'PAID' AND
        "completed_at" >= ${prevFrom} AND 
        "completed_at" <= ${prevTo}
    `;

    const prevCostResult: any[] = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN oi.cost_snapshot IS NOT NULL THEN oi.cost_snapshot * oi.quantity
          ELSE 0.00 
        END), 0.00) as total_cost
      FROM "orders" o
      JOIN "order_items" oi ON o.id = oi.order_id
      WHERE 
        o.tenant_id = ${tenantId}::uuid AND 
        o.restaurant_id = ${restaurantId}::uuid AND 
        o.status = 'COMPLETED' AND 
        o.payment_status = 'PAID' AND
        o.completed_at >= ${prevFrom} AND 
        o.completed_at <= ${prevTo}
    `;

    const prevRevenue = Number(prevStats[0]?.revenue || 0);
    const prevOrders = Number(prevStats[0]?.orders || 0);
    const prevCost = Number(prevCostResult[0]?.total_cost || 0);
    const prevProfit = prevRevenue - prevCost;

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    comparison = {
      revenue: {
        current: totalRevenue,
        previous: prevRevenue,
        growth: calculateGrowth(totalRevenue, prevRevenue)
      },
      orders: {
        current: totalOrders,
        previous: prevOrders,
        growth: calculateGrowth(totalOrders, prevOrders)
      },
      profit: {
        current: totalProfit,
        previous: prevProfit,
        growth: calculateGrowth(totalProfit, prevProfit)
      }
    };
  }

  return {
    trends,
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
    paymentMethods: paymentMethods.map(pm => ({
      method: pm.method,
      count: Number(pm.count),
      amount: Number(pm.amount)
    })),
    comparison,
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
