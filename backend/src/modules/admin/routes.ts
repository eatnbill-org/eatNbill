import { Router } from 'express';
import { 
  adminAuthMiddleware, 
  adminRateLimiter,
  adminIPAllowlist,
} from '../../middlewares/admin.middleware';
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
  createRestaurantController,
  updateRestaurantController,
  deleteRestaurantController,
  // Users
  listUsersController,
  getUserController,
  createOwnerController,
  // Subscriptions
  listSubscriptionsController,
  updateSubscriptionController,
  // Impersonation
  impersonateController,
  // Audit Logs
  listAuditLogsController,
  // Health
  getHealthController,
  // Integration Webhooks
  listAllWebhookLogsController,
  replayWebhookController,
} from './controller';
import {
  // Tenants
  createTenantSchema,
  updateTenantSchema,
  tenantIdParamSchema,
  listTenantsQuerySchema,
  // Restaurants
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantIdParamSchema,
  listRestaurantsQuerySchema,
  // Users
  createOwnerSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  // Subscriptions
  updateSubscriptionSchema,
  listSubscriptionsQuerySchema,
  // Impersonation
  impersonateSchema,
  // Audit Logs
  listAuditLogsQuerySchema,
} from './schema';

export function adminRoutes() {
  const router = Router();

  // ==========================================
  // MIDDLEWARE CHAIN (applied to ALL admin routes)
  // rateLimit -> IP allowlist -> auth -> validation -> controller
  // ==========================================
  router.use(adminRateLimiter);
  router.use(adminIPAllowlist);
  router.use(adminAuthMiddleware);

  // ==========================================
  // DASHBOARD
  // ==========================================
  router.get('/dashboard/overview', getDashboardOverviewController);

  // ==========================================
  // TENANT MANAGEMENT
  // ==========================================
  router.get(
    '/tenants',
    validateQuery(listTenantsQuerySchema),
    listTenantsController
  );

  router.post(
    '/tenants',
    validateBody(createTenantSchema),
    createTenantController
  );

  router.get(
    '/tenants/:tenantId',
    validateParams(tenantIdParamSchema),
    getTenantController
  );

  router.patch(
    '/tenants/:tenantId',
    validateParams(tenantIdParamSchema),
    validateBody(updateTenantSchema),
    updateTenantController
  );

  router.post(
    '/tenants/:tenantId/suspend',
    validateParams(tenantIdParamSchema),
    suspendTenantController
  );

  router.post(
    '/tenants/:tenantId/activate',
    validateParams(tenantIdParamSchema),
    activateTenantController
  );

  // ==========================================
  // RESTAURANT MANAGEMENT (Cross-Tenant)
  // ==========================================
  router.get(
    '/restaurants',
    validateQuery(listRestaurantsQuerySchema),
    listRestaurantsController
  );

  router.post(
    '/restaurants',
    validateBody(createRestaurantSchema),
    createRestaurantController
  );

  router.get(
    '/restaurants/:restaurantId',
    validateParams(restaurantIdParamSchema),
    getRestaurantController
  );

  router.patch(
    '/restaurants/:restaurantId',
    validateParams(restaurantIdParamSchema),
    validateBody(updateRestaurantSchema),
    updateRestaurantController
  );

  router.delete(
    '/restaurants/:restaurantId',
    validateParams(restaurantIdParamSchema),
    deleteRestaurantController
  );

  // ==========================================
  // USER MANAGEMENT
  // ==========================================
  router.get(
    '/users',
    validateQuery(listUsersQuerySchema),
    listUsersController
  );

  router.get(
    '/users/:userId',
    validateParams(userIdParamSchema),
    getUserController
  );

  router.post(
    '/users/owner',
    validateBody(createOwnerSchema),
    createOwnerController
  );

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================
  router.get(
    '/subscriptions',
    validateQuery(listSubscriptionsQuerySchema),
    listSubscriptionsController
  );

  router.patch(
    '/subscriptions/:tenantId',
    validateParams(tenantIdParamSchema),
    validateBody(updateSubscriptionSchema),
    updateSubscriptionController
  );

  // ==========================================
  // IMPERSONATION (POWER TOOL)
  // ==========================================
  router.post(
    '/impersonate',
    validateBody(impersonateSchema),
    impersonateController
  );

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  router.get(
    '/audit-logs',
    validateQuery(listAuditLogsQuerySchema),
    listAuditLogsController
  );

  // ==========================================
  // INTEGRATION WEBHOOK MANAGEMENT
  // ==========================================
  router.get('/integrations/webhooks', listAllWebhookLogsController);
  router.post('/integrations/webhooks/:logId/replay', replayWebhookController);

  // ==========================================
  // SYSTEM HEALTH
  // ==========================================
  router.get('/health', getHealthController);

  return router;
}
