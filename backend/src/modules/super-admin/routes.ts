import { Router } from 'express';
import { 
  superAdminAuthMiddleware,
  superAdminRateLimiter,
} from './middleware';
import { validateBody, validateQuery, validateParams } from '../../middlewares/validation.middleware';
import {
  // Dashboard
  getDashboardOverviewController,
  // Tenants
  listTenantsController,
  getTenantController,
  createTenantController,
  updateTenantController,
  suspendTenantController,
  activateTenantController,
  // Restaurants
  listRestaurantsController,
  getRestaurantController,
  // Users
  listUsersController,
  getUserController,
  // User Activity
  getUserActivityController,
  listUserSessionsController,
  // Audit Logs
  listAuditLogsController,
  // System
  getSystemHealthController,
} from './controller';
import {
  // Tenants
  createTenantSchema,
  updateTenantSchema,
  tenantIdParamSchema,
  listTenantsQuerySchema,
  // Restaurants
  listRestaurantsQuerySchema,
  restaurantIdParamSchema,
  // Users
  listUsersQuerySchema,
  userIdParamSchema,
  // Activity
  listUserActivityQuerySchema,
  // Audit Logs
  listAuditLogsQuerySchema,
} from './schema';

export function superAdminRoutes() {
  const router = Router();

  // Apply rate limiter and auth middleware to all super-admin routes
  router.use(superAdminRateLimiter);
  router.use(superAdminAuthMiddleware);

  // ==========================================
  // DASHBOARD
  // ==========================================
  router.get('/dashboard/overview', getDashboardOverviewController);

  // ==========================================
  // TENANT MANAGEMENT
  // ==========================================
  router.get('/tenants', validateQuery(listTenantsQuerySchema), listTenantsController);
  router.post('/tenants', validateBody(createTenantSchema), createTenantController);
  router.get('/tenants/:tenantId', validateParams(tenantIdParamSchema), getTenantController);
  router.patch('/tenants/:tenantId', validateParams(tenantIdParamSchema), validateBody(updateTenantSchema), updateTenantController);
  router.post('/tenants/:tenantId/suspend', validateParams(tenantIdParamSchema), suspendTenantController);
  router.post('/tenants/:tenantId/activate', validateParams(tenantIdParamSchema), activateTenantController);

  // ==========================================
  // RESTAURANT MANAGEMENT (Cross-Tenant)
  // ==========================================
  router.get('/restaurants', validateQuery(listRestaurantsQuerySchema), listRestaurantsController);
  router.get('/restaurants/:restaurantId', validateParams(restaurantIdParamSchema), getRestaurantController);

  // ==========================================
  // USER MANAGEMENT
  // ==========================================
  router.get('/users', validateQuery(listUsersQuerySchema), listUsersController);
  router.get('/users/:userId', validateParams(userIdParamSchema), getUserController);

  // ==========================================
  // USER ACTIVITY TRACKING
  // ==========================================
  router.get('/users/:userId/activity', validateParams(userIdParamSchema), validateQuery(listUserActivityQuerySchema), getUserActivityController);
  router.get('/users/:userId/sessions', validateParams(userIdParamSchema), listUserSessionsController);

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  router.get('/audit-logs', validateQuery(listAuditLogsQuerySchema), listAuditLogsController);

  // ==========================================
  // SYSTEM HEALTH
  // ==========================================
  router.get('/system/health', getSystemHealthController);

  return router;
}
