import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { rateLimiters } from '../../middlewares';
import { requireRole } from '../../middlewares/require-role.middleware';
import { subscriptionMiddleware } from '../../middlewares/subscription.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import {
  addProductImageController,
  createProductController,
  deleteProductController,
  deleteProductImageController,
  getProductController,
  listProductImagesController,
  listProductsController,
  publicMenuController,
  updateProductController,
  getCategoriesController,
} from './controller';
import { createProductSchema, updateProductSchema, uploadProductImageSchema } from './schema';

export function productRoutes() {
  const router = Router();

  router.get(
    '/categories',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    getCategoriesController
  );

  router.get(
    '/',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    listProductsController
  );

  router.post(
    '/',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    validateBody(createProductSchema),
    createProductController
  );

  router.get(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    getProductController
  );

  router.patch(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    validateBody(updateProductSchema),
    updateProductController
  );

  router.delete(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    deleteProductController
  );

  // Product images
  router.get(
    '/:id/images',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    listProductImagesController
  );

  router.post(
    '/:id/images',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    validateBody(uploadProductImageSchema),
    addProductImageController 
  );

  router.delete(
    '/:id/images/:imageId',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    subscriptionMiddleware,
    requireRole('OWNER', 'MANAGER', 'WAITER'),
    deleteProductImageController
  );

  return router;
}

export function publicProductRoutes() {
  const router = Router();

  router.get(
    '/:restaurant_slug/menu',
    rateLimiters.default,
    publicMenuController
  );

  return router;
}
