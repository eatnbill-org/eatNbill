import { z } from 'zod/v4';

// ==========================================
// TENANT MANAGEMENT
// ==========================================

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('FREE'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  notes: z.string().max(1000).optional(),
});

export const tenantIdParamSchema = z.object({
  tenantId: z.string().uuid(),
});

export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  search: z.string().optional(),
});

// ==========================================
// RESTAURANT MANAGEMENT
// ==========================================

export const createRestaurantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  city: z.string().max(100).optional(),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  city: z.string().max(100).optional(),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().uuid(),
});

export const listRestaurantsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
});

// ==========================================
// USER MANAGEMENT
// ==========================================

export const createOwnerSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tenantId: z.string().uuid().optional(),
  role: z.enum(['OWNER', 'MANAGER', 'WAITER']).optional(),
  search: z.string().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

export const updateSubscriptionSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
  overrides: z.object({
    maxProducts: z.number().min(0).optional(),
    maxRestaurants: z.number().min(0).optional(),
    maxCampaigns: z.number().min(0).optional(),
  }).optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
});

// ==========================================
// IMPERSONATION
// ==========================================

export const impersonateSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
});

// ==========================================
// AUDIT LOGS
// ==========================================

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  tenantId: z.string().uuid().optional(),
  adminId: z.string().uuid().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ==========================================
// IP BLOCKING
// ==========================================

// ==========================================
// TYPE EXPORTS
// ==========================================

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type ListRestaurantsQuery = z.infer<typeof listRestaurantsQuerySchema>;

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;

export type ImpersonateInput = z.infer<typeof impersonateSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
