import { z } from 'zod';

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

export const listRestaurantsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().uuid(),
});

// ==========================================
// USER MANAGEMENT
// ==========================================

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
// USER ACTIVITY
// ==========================================

export const listUserActivityQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
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
// TYPE EXPORTS
// ==========================================

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

export type ListRestaurantsQuery = z.infer<typeof listRestaurantsQuerySchema>;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListUserActivityQuery = z.infer<typeof listUserActivityQuerySchema>;

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
