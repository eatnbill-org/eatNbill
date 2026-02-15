import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { rateLimiters } from '../../middlewares';
import { requireRestaurantRole } from '../../middlewares/restaurantRole.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  listCategoriesController,
  publicCategoriesController,
  reorderCategoriesController,
  updateCategoryController,
} from './controller';
import { createCategorySchema, reorderCategoriesSchema, updateCategorySchema } from './schema';

export function categoryRoutes() {
  const router = Router();

  // List all categories
  router.get(
    '/',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    listCategoriesController
  );

  // Create category
  router.post(
    '/add',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    validateBody(createCategorySchema),
    createCategoryController
  );

  // Reorder categories (batch update sort_order)
  router.patch(
    '/reorder',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER'),
    validateBody(reorderCategoriesSchema),
    reorderCategoriesController
  );

  // Get single category
  router.get(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    getCategoryController
  );

  // Update category
  router.patch(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER'),
    validateBody(updateCategorySchema),
    updateCategoryController
  );

  // Delete category
  router.delete(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER'),
    deleteCategoryController
  );

  return router;
}

// Public routes (no auth required)
export function publicCategoryRoutes() {
  const router = Router();

  // Public: Get categories for a restaurant
  router.get('/:restaurantSlug/categories', rateLimiters.default, publicCategoriesController);

  return router;
}
