import { prisma } from '../../utils/prisma';
import type { Plan, Prisma } from '@prisma/client';

// Type until Prisma generates
type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

// ==========================================
// ADMIN USER
// ==========================================

export async function findAdminBySupabaseId(supabaseId: string) {
  return prisma.adminUser.findFirst({
    where: { supabase_id: supabaseId, is_active: true, deleted_at: null },
  });
}

export async function findAdminById(adminId: string) {
  return prisma.adminUser.findFirst({
    where: { id: adminId, deleted_at: null },
  });
}

// ==========================================
// TENANTS
// ==========================================

export async function listTenants(options: {
  page: number;
  limit: number;
  status?: TenantStatus;
  search?: string;
}) {
  const { page, limit, status, search } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.TenantWhereInput = {
    deleted_at: null,
    ...(status && { status }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const },
    }),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            users: { where: { deleted_at: null } },
            restaurants: { where: { deleted_at: null } },
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { tenants, total, page, limit };
}

export async function findTenantById(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, deleted_at: null },
    include: {
      _count: {
        select: {
          users: { where: { deleted_at: null } },
          restaurants: { where: { deleted_at: null } },
        },
      },
      users: {
        where: { role: 'OWNER', deleted_at: null },
        select: { id: true, email: true, role: true },
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
    data,
  });
}

export async function softDeleteTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { deleted_at: new Date() },
  });
}

// ==========================================
// RESTAURANTS
// ==========================================

export async function listRestaurants(options: {
  page: number;
  limit: number;
  tenantId?: string;
  search?: string;
}) {
  const { page, limit, tenantId, search } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.RestaurantWhereInput = {
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
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: {
          select: {
            products: { where: { deleted_at: null } },
          },
        },
      },
    }),
    prisma.restaurant.count({ where }),
  ]);

  return { restaurants, total, page, limit };
}

export async function findRestaurantById(restaurantId: string) {
  return prisma.restaurant.findFirst({
    where: { id: restaurantId, deleted_at: null },
    include: {
      tenant: { select: { id: true, name: true } },
      _count: {
        select: {
          products: { where: { deleted_at: null } },
          users: { where: { role: 'WAITER', is_active: true } }, // Staff count
        },
      },
    },
  });
}

export async function findRestaurantBySlug(slug: string) {
  return prisma.restaurant.findFirst({
    where: { slug, deleted_at: null },
  });
}

export async function createRestaurant(data: {
  tenantId: string;
  name: string;
  slug: string;
}) {
  return prisma.restaurant.create({
    data: {
      tenant_id: data.tenantId,
      name: data.name,
      slug: data.slug,
    },
  });
}

export async function updateRestaurant(
  restaurantId: string,
  data: { name?: string; slug?: string }
) {
  return prisma.restaurant.update({
    where: { id: restaurantId },
    data,
  });
}

export async function softDeleteRestaurant(restaurantId: string) {
  return prisma.restaurant.update({
    where: { id: restaurantId },
    data: { deleted_at: new Date() },
  });
}

// ==========================================
// USERS
// ==========================================

export async function listUsers(options: {
  page: number;
  limit: number;
  tenantId?: string;
  role?: 'OWNER' | 'MANAGER' | 'WAITER';
  search?: string;
}) {
  const { page, limit, tenantId, role, search } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deleted_at: null,
    ...(tenantId && { tenant_id: tenantId }),
    ...(role && { role }),
    ...(search && {
      email: { contains: search, mode: 'insensitive' as const },
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        created_at: true,
        tenant: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

export async function findUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    include: {
      tenant: { select: { id: true, name: true } },
      restaurant_users: {
        where: { is_active: true },
        include: { restaurant: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
}

export async function createUser(data: {
  tenantId: string;
  email: string;
  supabaseId: string;
  role: 'OWNER' | 'MANAGER' | 'WAITER';
}) {
  return prisma.user.create({
    data: {
      tenant_id: data.tenantId,
      email: data.email,
      supabase_id: data.supabaseId,
      role: data.role,
    },
  });
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { is_active: isActive },
  });
}

// ==========================================
// PLATFORM AUDIT LOGS
// ==========================================

export async function createPlatformAuditLog(data: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  impersonating?: string;
}) {
  return prisma.platformAuditLog.create({
    data: {
      admin_id: data.adminId,
      action: data.action,
      entity: data.entity,
      entity_id: data.entityId,
      tenant_id: data.tenantId,
      metadata: data.metadata as any,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      impersonating: data.impersonating,
    },
  });
}

export async function listPlatformAuditLogs(options: {
  page: number;
  limit: number;
  tenantId?: string;
  adminId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { page, limit, tenantId, adminId, action, entity, startDate, endDate } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.PlatformAuditLogWhereInput = {
    ...(tenantId && { tenant_id: tenantId }),
    ...(adminId && { admin_id: adminId }),
    ...(action && { action }),
    ...(entity && { entity }),
    ...((startDate || endDate) && {
      created_at: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        admin: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

// ==========================================\n// DASHBOARD AGGREGATES\n// ==========================================

export async function getDashboardStats() {
  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    totalRestaurants,
    totalUsers,
    totalProducts,
  ] = await Promise.all([
    prisma.tenant.count({ where: { deleted_at: null } }),
    prisma.tenant.count({ where: { status: 'ACTIVE', deleted_at: null } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED', deleted_at: null } }),
    prisma.restaurant.count({ where: { deleted_at: null } }),
    prisma.user.count({ where: { deleted_at: null } }),
    prisma.product.count({ where: { deleted_at: null } }),
  ]);

  const planDistribution = await prisma.tenant.groupBy({
    by: ['plan'],
    where: { deleted_at: null },
    _count: true,
  });

  return {
    totalTenants,
    activeTenants,
    suspendedTenants,
    totalRestaurants,
    totalUsers,
    totalProducts,
    planDistribution: planDistribution.map(p => ({
      plan: p.plan,
      count: p._count,
    })),
  };
}
