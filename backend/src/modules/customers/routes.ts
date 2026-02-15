import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { rateLimiters } from '../../middlewares';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requireRestaurantRole } from '../../middlewares/restaurantRole.middleware';
import {
  createCustomerController,
  getCustomerController,
  listCustomersController,
  updateCustomerController,
  updateCustomerTagsController,
  getCustomerAnalyticsController,
  getCustomerOrdersController,
  publicOrderHistoryController,
  updateCustomerCreditController,
  deleteCustomerController,
} from './controller';

export function customerRoutes() {
  const router = Router();

  // Public endpoint - no auth required
  router.post('/public/orders-by-phone', rateLimiters.auth, publicOrderHistoryController);

  // Protected routes
  router.use(rateLimiters.default);
  router.use(authMiddleware);
  router.use(tenantMiddleware);

  router.get(
    '/',
    requireRestaurantRole('OWNER', 'MANAGER'),
    listCustomersController
  );

  router.get(
    '/:id',
    requireRestaurantRole('OWNER', 'MANAGER'),
    getCustomerController
  );

  router.get(
    '/:id/orders',
    requireRestaurantRole('OWNER', 'MANAGER'),
    getCustomerOrdersController
  );

  router.get(
    '/:id/analytics',
    requireRestaurantRole('OWNER', 'MANAGER'),
    getCustomerAnalyticsController
  );

  router.post(
    '/',
    requireRestaurantRole('OWNER', 'MANAGER'),
    createCustomerController
  );

  router.patch(
    '/:id',
    requireRestaurantRole('OWNER', 'MANAGER'),
    updateCustomerController
  );

  router.patch(
    '/:id/tags',
    requireRestaurantRole('OWNER', 'MANAGER'),
    updateCustomerTagsController
  );

  router.patch(
    '/:id/credit',
    requireRestaurantRole('OWNER', 'MANAGER'),
    updateCustomerCreditController
  );

  router.delete(
    '/:id',
    requireRestaurantRole('OWNER', 'MANAGER'),
    deleteCustomerController
  );

  return router;
}
