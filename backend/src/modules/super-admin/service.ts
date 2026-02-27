import { AppError } from '../../middlewares/error.middleware';
import type { Plan, TenantStatus } from '@prisma/client';
import * as repo from './repository';
import type {
  CreateTenantInput,
  UpdateTenantInput,
  ListTenantsQuery,
  ListRestaurantsQuery,
  ListUsersQuery,
  ListUserActivityQuery,
  ListAuditLogsQuery,
} from './schema';

// ==========================================
// DASHBOARD
// ==========================================

export async function getDashboardOverview() {
  const [
    tenantStats,
    userStats,
    restaurantStats,
    orderStats,
    recentActivity,
    planDistribution,
  ] = await Promise.all([
    repo.getTenantStats(),
    repo.getUserStats(),
    repo.getRestaurantStats(),
    repo.getOrderStats(),
    repo.getRecentActivity(10),
    repo.getPlanDistribution(),
  ]);

  return {
    stats: {
      totalTenants: tenantStats.total,
      activeTenants: tenantStats.active,
      suspendedTenants: tenantStats.suspended,
      totalUsers: userStats.total,
      activeUsers: userStats.active,
      totalRestaurants: restaurantStats.total,
      totalOrders: orderStats.total,
      totalRevenue: orderStats.totalRevenue,
    },
    recentActivity,
    planDistribution,
  };
}

// ==========================================
// TENANT MANAGEMENT
// ==========================================

export async function listTenants(query: ListTenantsQuery) {
  return repo.listTenants({
    page: query.page,
    limit: query.limit,
    status: query.status as TenantStatus | undefined,
    search: query.search,
  });
}

export async function getTenantById(tenantId: string) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }
  return tenant;
}

export async function createTenant(input: CreateTenantInput) {
  return repo.createTenant({
    name: input.name,
    plan: input.plan as Plan,
  });
}

export async function updateTenant(tenantId: string, input: UpdateTenantInput) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  return repo.updateTenant(tenantId, {
    name: input.name,
    plan: input.plan as Plan | undefined,
    status: input.status as TenantStatus | undefined,
    notes: input.notes,
  });
}

export async function suspendTenant(tenantId: string, reason?: string) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  return repo.updateTenant(tenantId, {
    status: 'SUSPENDED',
    notes: reason ? `Suspended: ${reason}` : 'Suspended by super admin',
  });
}

export async function activateTenant(tenantId: string) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  return repo.updateTenant(tenantId, {
    status: 'ACTIVE',
    notes: 'Activated by super admin',
  });
}

// ==========================================
// RESTAURANT MANAGEMENT
// ==========================================

export async function listRestaurants(query: ListRestaurantsQuery) {
  return repo.listRestaurants({
    page: query.page,
    limit: query.limit,
    tenantId: query.tenantId,
    search: query.search,
  });
}

export async function getRestaurantById(restaurantId: string) {
  const restaurant = await repo.findRestaurantById(restaurantId);
  if (!restaurant) {
    throw new AppError('NOT_FOUND', 'Restaurant not found', 404);
  }
  return restaurant;
}

// ==========================================
// USER MANAGEMENT
// ==========================================

export async function listUsers(query: ListUsersQuery) {
  return repo.listUsers({
    page: query.page,
    limit: query.limit,
    tenantId: query.tenantId,
    role: query.role,
    search: query.search,
  });
}

export async function getUserById(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }
  return user;
}

// ==========================================
// USER ACTIVITY TRACKING
// ==========================================

export async function getUserActivity(userId: string, query: ListUserActivityQuery) {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  const [loginActivity, orderActivity, auditLogs] = await Promise.all([
    repo.getUserLoginActivity(userId, query.days || 30),
    repo.getUserOrderActivity(userId, query.days || 30),
    repo.getUserAuditLogs(userId, query.page || 1, query.limit || 20),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    },
    activity: {
      loginActivity,
      orderActivity,
      auditLogs,
    },
    summary: {
      totalLogins: loginActivity.length,
      totalOrders: orderActivity.reduce((sum, o) => sum + o.orderCount, 0),
      totalOrderValue: orderActivity.reduce((sum, o) => sum + Number(o.totalValue), 0),
      lastActive: loginActivity[0]?.created_at || null,
    },
  };
}

export async function listUserSessions(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  // Return active sessions (based on audit logs for now)
  // In a real implementation, you'd track sessions separately
  const recentLogins = await repo.getUserLoginActivity(userId, 7);
  
  return {
    userId,
    activeSessions: recentLogins.map((login, index) => ({
      id: `session_${index}`,
      ipAddress: login.ip_address,
      userAgent: login.user_agent,
      createdAt: login.created_at,
      lastActive: login.created_at,
    })),
  };
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function listAuditLogs(query: ListAuditLogsQuery) {
  return repo.listPlatformAuditLogs({
    page: query.page,
    limit: query.limit,
    tenantId: query.tenantId,
    adminId: query.adminId,
    action: query.action,
    entity: query.entity,
    startDate: query.startDate,
    endDate: query.endDate,
  });
}

// ==========================================
// SYSTEM HEALTH
// ==========================================

export async function getSystemHealth() {
  const startTime = Date.now();
  
  // Check database
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await repo.getTenantStats();
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = 'unhealthy';
  }

  return {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
    },
  };
}
