import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { createAuditLog } from '../restaurants/repository';
import {
  addCategory,
  editCategory,
  getCategories,
  getCategory,
  getPublicCategories,
  removeCategory,
  setCategoryOrder,
} from './service';

function requireContext(req: Request) {
  if (!req.user?.tenantId || !req.restaurantId) {
    throw new AppError('FORBIDDEN', 'Missing restaurant context', 403);
  }
  return {
    restaurantId: req.restaurantId,
    userId: req.user.userId,
    tenantId: req.user.tenantId,
  };
}

function requireAdminOrManager(req: Request) {
  if (req.user?.restaurantRole !== 'OWNER' && req.user?.restaurantRole !== 'MANAGER') {
    throw new AppError('FORBIDDEN', 'Owner or Manager access required', 403);
  }
}

// List all categories for a restaurant
export async function listCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireContext(req);
    const categories = await getCategories(restaurantId);
    return res.json({ data: categories });
  } catch (error) {
    return next(error as Error);
  }
}

// Get single category
export async function getCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireContext(req);
    const id = req.params.id as string;

    const category = await getCategory(restaurantId, id);
    if (!category) {
      throw new AppError('NOT_FOUND', 'Category not found', 404);
    }

    return res.json({ data: category });
  } catch (error) {
    return next(error as Error);
  }
}

// Create category
export async function createCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, restaurantId, userId } = requireContext(req);
    const category = await addCategory(restaurantId, req.body);

    createAuditLog(tenantId, userId, 'CREATE', 'CATEGORY', category.id).catch(() => { });
    
    return res.status(201).json({ data: category });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return next(new AppError('CONFLICT', error.message, 409));
    }
    return next(error as Error);
  }
}

// Update category
export async function updateCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { tenantId, restaurantId, userId } = requireContext(req);
    const id = req.params.id as string;

    const category = await editCategory(restaurantId, id, req.body);

    await createAuditLog(tenantId, userId, 'UPDATE', 'CATEGORY', category.id);
    return res.json({ data: category });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return next(new AppError('NOT_FOUND', error.message, 404));
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      return next(new AppError('CONFLICT', error.message, 409));
    }
    return next(error as Error);
  }
}

// Delete category
export async function deleteCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { tenantId, restaurantId, userId } = requireContext(req);
    const id = req.params.id as string;

    await removeCategory(restaurantId, id);
    await createAuditLog(tenantId, userId, 'DELETE', 'CATEGORY', id);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return next(new AppError('NOT_FOUND', error.message, 404));
    }
    if (error instanceof Error && error.message.includes('Cannot delete')) {
      return next(new AppError('CONFLICT', error.message, 409));
    }
    return next(error as Error);
  }
}

// Reorder categories
export async function reorderCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { tenantId, restaurantId, userId } = requireContext(req);

    await setCategoryOrder(restaurantId, req.body.categories);
    await createAuditLog(tenantId, userId, 'UPDATE', 'CATEGORY_ORDER', undefined);
    return res.json({ data: { success: true } });
  } catch (error) {
    return next(error as Error);
  }
}

// Public: Get categories for a restaurant (read-only, no auth)
export async function publicCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantSlug = req.params.restaurantSlug as string;
    const categories = await getPublicCategories(restaurantSlug);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ data: categories });
  } catch (error) {
    return next(error as Error);
  }
}
