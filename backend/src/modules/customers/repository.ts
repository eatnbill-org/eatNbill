import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

export async function listCustomers(
  tenantId: string,
  restaurantId: string,
  search?: string,
  tags?: string[],
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    ...(search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {}),
    ...(tags && tags.length > 0
      ? {
        tags: { hasSome: tags },
      }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  // Fetch order statistics for each customer
  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const [orderStats, lastOrder] = await Promise.all([
        prisma.order.aggregate({
          where: {
            customer_id: customer.id,
            // Removed status filter
          },
          _count: { id: true },
          _sum: { total_amount: true },
        }),
        prisma.order.findFirst({
          where: {
            customer_id: customer.id,
          },
          orderBy: { placed_at: 'desc' },
          select: { placed_at: true, completed_at: true },
        }),
      ]);

      return {
        ...customer,
        totalOrders: orderStats._count.id || 0,
        totalSpent: orderStats._sum.total_amount || 0,
        lastVisit: lastOrder?.placed_at?.toISOString() || lastOrder?.completed_at?.toISOString() || customer.created_at.toISOString(),
      };
    })
  );

  return {
    data: customersWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(
  tenantId: string,
  restaurantId: string,
  customerId: string
) {
  return prisma.customer.findFirst({
    where: {
      id: customerId,
      tenant_id: tenantId,
      restaurant_id: restaurantId,
    },
  });
}

export async function getCustomerOrders(
  customerPhone: string,
  restaurantId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        customer_phone: customerPhone,
        restaurant_id: restaurantId,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        order_number: true,
        customer_name: true,
        customer_phone: true,
        total_amount: true,
        status: true,
        order_type: true,
        source: true,
        placed_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        table_number: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          select: {
            id: true,
            product_id: true,
            name_snapshot: true,
            quantity: true,
            price_snapshot: true,
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        customer_phone: customerPhone,
        restaurant_id: restaurantId,
      }
    }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerAnalytics(
  tenantId: string,
  restaurantId: string,
  customerId: string,
  days: number = 90
) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenant_id: tenantId,
      restaurant_id: restaurantId,
    },
  });

  if (!customer) {
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Query all orders by customer phone number (all time for total stats)
  const [allTimeStats, periodStats, recentOrders, allOrders, favoriteItems] = await Promise.all([
    // All-time statistics using customer_phone - COUNT ALL ORDERS
    prisma.order.aggregate({
      where: {
        customer_phone: customer.phone,
        restaurant_id: restaurantId,
        // Removed status: 'COMPLETED' to count ALL orders
      },
      _count: { id: true },
      _sum: { total_amount: true },
      _avg: { total_amount: true },
    }),

    // Period statistics - COUNT ALL ORDERS
    prisma.order.aggregate({
      where: {
        customer_phone: customer.phone,
        restaurant_id: restaurantId,
        completed_at: { gte: since },
        // Removed status: 'COMPLETED'
      },
      _count: { id: true },
      _sum: { total_amount: true },
      _avg: { total_amount: true },
    }),

    // Recent orders for visit pattern analysis
    prisma.order.findMany({
      where: {
        customer_phone: customer.phone,
        restaurant_id: restaurantId,
        completed_at: { gte: since },
      },
      select: {
        completed_at: true,
        placed_at: true,
        total_amount: true,
        order_type: true,
      },
      orderBy: { placed_at: 'desc' },
    }),

    // All orders with full details (for first/last order dates)
    prisma.order.findMany({
      where: {
        customer_phone: customer.phone,
        restaurant_id: restaurantId,
      },
      select: {
        id: true,
        completed_at: true,
        placed_at: true,
      },
      orderBy: { placed_at: 'asc' },
    }),

    // Most ordered items - using customer_phone
    prisma.orderItem.groupBy({
      by: ['product_id', 'name_snapshot'],
      where: {
        order: {
          customer_phone: customer.phone,
          restaurant_id: restaurantId,
          completed_at: { gte: since },
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  // Calculate visit patterns
  const visitsByDayOfWeek = recentOrders.reduce(
    (acc, order) => {
      if (order.completed_at) {
        const day = order.completed_at.getDay();
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    },
    {} as Record<number, number>
  );

  const visitsByHour = recentOrders.reduce(
    (acc, order) => {
      if (order.completed_at) {
        const hour = order.completed_at.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    },
    {} as Record<number, number>
  );

  // Get first and last order dates
  const firstOrder = allOrders[0];
  const lastOrder = allOrders[allOrders.length - 1];

  // Determine loyalty status (based on orders in period)
  const isLoyal =
    periodStats._count.id >= 5 && periodStats._count.id >= 3 && days <= 90;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tags: customer.tags,
      // Use all-time stats instead of period stats
      visit_count: allTimeStats._count.id,
      first_visit_date: firstOrder?.placed_at || firstOrder?.completed_at || null,
      last_visit_date: lastOrder?.placed_at || lastOrder?.completed_at || null,
      last_order_date: lastOrder?.placed_at || lastOrder?.completed_at || null,
      total_spent: allTimeStats._sum.total_amount || 0,
      average_order_value: allTimeStats._avg.total_amount || 0,
      credit_balance: customer.credit_balance,
      is_loyal: isLoyal,
    },
    period: {
      days,
      since,
      orders_count: periodStats._count.id,
      total_spent: periodStats._sum.total_amount || 0,
      average_order_value: periodStats._avg.total_amount || 0,
    },
    favoriteItems: favoriteItems.map((item) => ({
      product_id: item.product_id,
      name: item.name_snapshot,
      order_count: item._count.id,
      total_quantity: item._sum.quantity || 0,
    })),
    visitPatterns: {
      byDayOfWeek: visitsByDayOfWeek,
      byHour: visitsByHour,
    },
  };
}

export async function createCustomer(
  tenantId: string,
  restaurantId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    notes?: string;
    credit_balance?: number;
  }
) {
  return prisma.customer.create({
    data: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      tags: data.tags || [],
      notes: data.notes,
      credit_balance: data.credit_balance || 0,
    },
  });
}

export async function updateCustomer(
  customerId: string,
  data: { name?: string; phone?: string; email?: string; notes?: string; credit_balance?: number }
) {
  return prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      credit_balance: data.credit_balance,
    },
  });
}

export async function updateCustomerTags(customerId: string, tags: string[]) {
  return prisma.customer.update({
    where: { id: customerId },
    data: { tags },
  });
}

export async function updateCustomerCredit(customerId: string, amount: number) {
  return prisma.customer.update({
    where: { id: customerId },
    data: {
      credit_balance: {
        increment: amount,
      },
    },
  });
}

export async function deleteCustomer(customerId: string) {
  return prisma.customer.delete({
    where: { id: customerId },
  });
}

/**
 * Deprecated: Analytics are now calculated dynamically from orders
 * Keeping stub for backward compatibility
 */
export async function updateCustomerStats(
  customerId: string,
  orderAmount: Decimal.Value,
  orderDate: Date
) {
  // No-op: Analytics calculated dynamically from orders relation
  return prisma.customer.findUnique({ where: { id: customerId } });
}

export async function getOrdersByPhone(
  phone: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        customer_phone: phone,
        OR: [
          { status: 'COMPLETED' },
          { status: 'PLACED' },
          { status: 'PREPARING' },
          { status: 'READY' },
        ],
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        order_number: true,
        customer_name: true,
        customer_phone: true,
        total_amount: true,
        status: true,
        order_type: true,
        source: true,
        placed_at: true,
        completed_at: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
          },
        },
        items: {
          select: {
            name_snapshot: true,
            quantity: true,
            price_snapshot: true,
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        customer_phone: phone,
        OR: [
          { status: 'COMPLETED' },
          { status: 'PLACED' },
          { status: 'PREPARING' },
          { status: 'READY' },
        ],
      },
    }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: userId ?? undefined,
      action,
      entity,
      entity_id: entityId,
      metadata: metadata as any,
    },
  });
}