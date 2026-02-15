import { AppError } from '../../middlewares/error.middleware';
import { supabaseAnon } from '../../utils/supabase';
import type { Plan } from '@prisma/client';
import * as repo from './repository';

// Type until Prisma generates after migration
type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
import type {
  CreateTenantInput,
  UpdateTenantInput,
  ListTenantsQuery,
  CreateRestaurantInput,
  UpdateRestaurantInput,
  ListRestaurantsQuery,
  CreateOwnerInput,
  ListUsersQuery,
  UpdateSubscriptionInput,
  ImpersonateInput,
  ListAuditLogsQuery,
} from './schema';

// ==========================================
// DASHBOARD
// ==========================================

export async function getDashboardOverview() {
  return repo.getDashboardStats();
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
    notes: reason ? `Suspended: ${reason}` : 'Suspended by admin',
  });
}

export async function activateTenant(tenantId: string) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  return repo.updateTenant(tenantId, {
    status: 'ACTIVE',
    notes: 'Activated by admin',
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

export async function createRestaurant(input: CreateRestaurantInput) {
  // Verify tenant exists
  const tenant = await repo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  // Check slug uniqueness (globally unique)
  const existingSlug = await repo.findRestaurantBySlug(input.slug);
  if (existingSlug) {
    throw new AppError('CONFLICT', 'Restaurant slug already exists', 409);
  }

  return repo.createRestaurant({
    tenantId: input.tenantId,
    name: input.name,
    slug: input.slug,
  });
}

export async function updateRestaurant(restaurantId: string, input: UpdateRestaurantInput) {
  const restaurant = await repo.findRestaurantById(restaurantId);
  if (!restaurant) {
    throw new AppError('NOT_FOUND', 'Restaurant not found', 404);
  }

  // Check slug uniqueness if changing
  if (input.slug && input.slug !== restaurant.slug) {
    const existingSlug = await repo.findRestaurantBySlug(input.slug);
    if (existingSlug) {
      throw new AppError('CONFLICT', 'Restaurant slug already exists', 409);
    }
  }

  return repo.updateRestaurant(restaurantId, {
    name: input.name,
    slug: input.slug,
  });
}

export async function deleteRestaurant(restaurantId: string) {
  const restaurant = await repo.findRestaurantById(restaurantId);
  if (!restaurant) {
    throw new AppError('NOT_FOUND', 'Restaurant not found', 404);
  }

  return repo.softDeleteRestaurant(restaurantId);
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

export async function createOwner(input: CreateOwnerInput) {
  // Verify tenant exists
  const tenant = await repo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  // Check if user already exists
  const existingUser = await repo.findUserByEmail(input.email);
  if (existingUser) {
    throw new AppError('CONFLICT', 'User with this email already exists', 409);
  }

  // Invite via Supabase Auth
  const { data, error } = await supabaseAnon.auth.admin.inviteUserByEmail(input.email);
  
  if (error) {
    throw new AppError('SUPABASE_ERROR', error.message, 400);
  }

  if (!data.user) {
    throw new AppError('SUPABASE_ERROR', 'Failed to create Supabase user', 400);
  }

  // Create internal user record
  return repo.createUser({
    tenantId: input.tenantId,
    email: input.email,
    supabaseId: data.user.id,
    role: 'OWNER',
  });
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

export async function listSubscriptions(query: ListUsersQuery) {
  // Subscriptions are tied to tenants - return tenant plan info
  return repo.listTenants({
    page: query.page,
    limit: query.limit,
  });
}

export async function updateSubscription(tenantId: string, input: UpdateSubscriptionInput) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  // Update tenant plan
  const updated = await repo.updateTenant(tenantId, {
    plan: input.plan as Plan,
  });

  // TODO: Store overrides in separate table if needed
  // For now, return the updated tenant
  return {
    tenant: updated,
    overrides: input.overrides,
  };
}

// ==========================================
// IMPERSONATION
// ==========================================

export async function impersonate(input: ImpersonateInput) {
  // Verify tenant exists
  const tenant = await repo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant not found', 404);
  }

  // Verify user exists and belongs to tenant
  const user = await repo.findUserById(input.userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  if (user.tenant.id !== input.tenantId) {
    throw new AppError('FORBIDDEN', 'User does not belong to this tenant', 403);
  }

  // Return impersonation context
  // In a real implementation, this would generate a time-limited token
  return {
    success: true,
    impersonating: {
      userId: user.id,
      tenantId: user.tenant.id,
      email: user.email,
      role: user.role,
    },
    message: 'Impersonation context created. All actions will be logged.',
    expiresIn: '1h',
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
    await repo.getDashboardStats();
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = 'unhealthy';
  }

  return {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
    },
  };
}

// ==========================================
// INTEGRATION WEBHOOK MANAGEMENT
// ==========================================

import * as integrationService from '../integrations/service';
import * as integrationRepo from '../integrations/repository';

export async function listAllWebhookLogs(query: {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  tenant_id?: string;
}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  const { logs, total } = await integrationRepo.listWebhookLogsForAdmin({
    skip,
    take: limit,
    status: query.status as any,
    platform: query.platform as any,
    tenantId: query.tenant_id,
  });

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

export async function replayWebhook(logId: string, adminId: string) {
  return integrationService.replayWebhook(logId, adminId);
}
