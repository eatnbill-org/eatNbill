import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { createAuditLog } from './repository';
import { redisClient } from '../../utils/redis';
import {
  createRestaurantProduct,
  deleteRestaurantProduct,
  getPublicMenu,
  getRestaurantProduct,
  addProductImage,
  getProductImages,
  removeProductImage,
  listRestaurantProducts,
  updateRestaurantProduct,
  getRestaurantProductCategories,
} from './service';

function requireAuthContext(req: Request) {
  if (!req.user || !req.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant context required', 403);
  }

  return { user: req.user, restaurantId: req.restaurantId };
}

export async function listProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const products = await listRestaurantProducts(restaurantId);
    return res.json({ products });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const product = await createRestaurantProduct(restaurantId, req.body);

    createAuditLog(user.tenantId, user.userId, 'CREATE', 'PRODUCT', product.id).catch(() => { });
    redisClient.delete(`product_count:${user.tenantId}`).catch(() => { });
    
    return res.status(201).json(product);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const product = await getRestaurantProduct(restaurantId, req.params.id as string);
    return res.json(product);
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const product = await updateRestaurantProduct(
      restaurantId,
      req.params.id as string,
      req.body
    );
    await createAuditLog(user.tenantId, user.userId, 'UPDATE', 'PRODUCT', product.id);
    return res.json(product);
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const result = await deleteRestaurantProduct(
      restaurantId,
      req.params.id as string
    ); 
    await createAuditLog(user.tenantId, user.userId, 'DELETE', 'PRODUCT', req.params.id as string);
    redisClient.delete(`product_count:${user.tenantId}`).catch(() => { });
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function publicMenuController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getPublicMenu(req.params.restaurant_slug as string);
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function addProductImageController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const image = await addProductImage(
      restaurantId,
      req.params.id as string,
      req.body
    );
    await createAuditLog(user.tenantId, user.userId, 'CREATE', 'PRODUCT_IMAGE', image.id, {
      product_id: req.params.id as string,
    });
    return res.status(201).json(image);
  } catch (error) {
    return next(error as Error);
  }
}

export async function listProductImagesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const images = await getProductImages(restaurantId, req.params.id as string);
    return res.json({ images });
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteProductImageController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireAuthContext(req);
    const result = await removeProductImage(
      restaurantId,
      req.params.id as string,
      req.params.imageId as string
    );
    await createAuditLog(user.tenantId, user.userId, 'DELETE', 'PRODUCT_IMAGE', req.params.imageId as string, {
      product_id: req.params.id as string,
    });
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// Get product categories
export async function getCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireAuthContext(req);
    const categories = await getRestaurantProductCategories(restaurantId);
    return res.json({ data: categories });
  } catch (error) {
    return next(error as Error);
  }
}
