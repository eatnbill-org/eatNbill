import { prisma } from '../../utils/prisma';
import type { Plan, TenantStatus } from '@prisma/client';

// ==========================================
// DASHBOARD REPOSITORY
// ==========================================

export async function getTenantStats() {
  const [total, active, suspended] = await Promise.all([
    prisma.tenant.count({ where: { deleted_at: null } }),
    prisma.tenant.count({ where: { status: 'ACTIVE', deleted_at: null } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED', deleted_at: null } }),
  ]);

  return { total, active, suspended };
}

export async function getUserStats() {
  const [total, active] = await Promise.all([
    prisma.user.count({ where: { deleted_at: null } }),
    prisma.user.count({ where: { is_active: true, deleted_at: null } }),
  ]);

  return { total, active };
}

export async function getRestaurantStats() {
  const total = await prisma.restaurant.count({ where: { deleted_at: null } });
  return { total };
}

export async function getOrderStats() {
  const result = await prisma.order.aggregate({
    where: { deleted_at: null },
    _count: { id: true },
    _sum: { total_amount: true },
  });

  return {
    total: result._count.id,
    totalRevenue: result._sum.total_amount?.toString() || '0',
  };
}

export async function getRecentActivity(limit: number) {
  return prisma.platformAuditLog.findMany({
    take: limit,
    orderBy: { created_at: 'desc' },
    include: {
      admin: {
        select: { name: true, email: true },
      },
    },
  });
}

export async function getPlanDistribution() {
  const distribution = await prisma.tenant.groupBy({
    by: ['plan'],
    where: { deleted_at: null },
    _count: { id: true },
  });

  return distribution.map(d => ({
    plan: d.plan,
    count: d._count.id,
  }));
}

// ==========================================
// TENANT REPOSITORY
// ==========================================

interface ListTenantsParams {
  page: number;
  limit: number;
  status?: TenantStatus;
  search?: string;
}

export async function listTenants({ page, limit, status, search }: ListTenantsParams) {
  const where = {
    deleted_at: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            restaurants: true,
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    data: tenants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findTenantById(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { deleted_at: null },
        select: { id: true, email: true, role: true, is_active: true },
      },
      restaurants: {
        where: { deleted_at: null },
        select: { id: true, name: true, slug: true, created_at: true },
      },
    },
  });
}

export async function createTenant(data: { name: string; plan: Plan }) {
  return prisma.tenant.create({
    data: {
      name: data.name,
      plan: data.plan,
      status: 'ACTIVE',
    },
  });
}

export async function updateTenant(
  tenantId: string,
  data: { name?: string; plan?: Plan; status?: TenantStatus; notes?: string }
) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
}

// ==========================================
// RESTAURANT REPOSITORY
// ==========================================

interface ListRestaurantsParams {
  page: number;
  limit: number;
  tenantId?: string;
  search?: string;
}

export async function listRestaurants({ page, limit, tenantId, search }: ListRestaurantsParams) {
  const where = {
    deleted_at: null,
    ...(tenantId && { tenant_id: tenantId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            orders: true,
            products: true,
          },
        },
      },
    }),
    prisma.restaurant.count({ where }),
  ]);

  return {
    data: restaurants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findRestaurantById(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      tenant: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          orders: true,
          products: true,
          users: true,
        },
      },
    },
  });
}

// ==========================================
// USER REPOSITORY
// ==========================================

interface ListUsersParams {
  page: number;
  limit: number;
  tenantId?: string;
  role?: string;
  search?: string;
}

export async function listUsers({ page, limit, tenantId, role, search }: ListUsersParams) {
  const where = {
    deleted_at: null,
    ...(tenantId && { tenant_id: tenantId }),
    ...(role && { role }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            restaurant_users: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        select: { id: true, name: true },
      },
      restaurant_users: {
        include: {
          restaurant: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });
}

// ==========================================
// USER ACTIVITY REPOSITORY
// ==========================================

export async function getUserLoginActivity(userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.platformAuditLog.findMany({
    where: {
      entity: 'USER_LOGIN',
      entity_id: userId,
      created_at: { gte: since },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
}

export async function getUserOrderActivity(userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.groupBy({
    by: ['status'],
    where: {
      waiter_id: userId,
      created_at: { gte: since },
    },
    _count: { id: true },
    _sum: { total_amount: true },
  });

  return orders.map(o => ({
    status: o.status,
    orderCount: o._count.id,
    totalValue: o._sum.total_amount?.toString() || '0',
  }));
}

export async function getUserAuditLogs(userId: string, page: number, limit: number) {
  const where = {
    entity_id: userId,
  };

  const [logs, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ==========================================
// AUDIT LOGS REPOSITORY
// ==========================================

interface ListAuditLogsParams {
  page: number;
  limit: number;
  tenantId?: string;
  adminId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function listPlatformAuditLogs({
  page,
  limit,
  tenantId,
  adminId,
  action,
  entity,
  startDate,
  endDate,
}: ListAuditLogsParams) {
  const where = {
    ...(tenantId && { tenant_id: tenantId }),
    ...(adminId && { admin_id: adminId }),
    ...(action && { action }),
    ...(entity && { entity }),
    ...(startDate && endDate && {
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        admin: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
