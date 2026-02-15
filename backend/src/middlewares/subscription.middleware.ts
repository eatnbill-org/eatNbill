import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { AppError } from './error.middleware';

const PRODUCT_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 500,
  ENTERPRISE: Number.POSITIVE_INFINITY,
};

export async function subscriptionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  if (req.method !== 'POST') {
    return next();
  }

  // ✅ Use cached tenant plan from auth middleware (avoids DB query)
  const plan = req.user.tenantPlan || 'FREE';
  const limit = PRODUCT_LIMITS[plan];
  
  if (limit === undefined || !Number.isFinite(limit)) {
    return next();
  }

  // ✅ Cache product count in Redis (5 min TTL) - avoids expensive COUNT query
  const cacheKey = `product_count:${req.user.tenantId}`;
  let productCount: number;
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached !== null) {
      productCount = parseInt(cached, 10);
    } else {
      productCount = await prisma.product.count({
        where: { 
          restaurant: { tenant_id: req.user.tenantId },
          deleted_at: null 
        },
      });
      // Cache for 5 minutes
      await redisClient.setex(cacheKey, 300, String(productCount));
    }
  } catch (err) {
    // Fallback to DB if Redis fails
    productCount = await prisma.product.count({
      where: { 
        restaurant: { tenant_id: req.user.tenantId },
        deleted_at: null 
      },
    });
  }

  if (productCount >= limit) {
    return next(new AppError('SUBSCRIPTION_LIMIT', 'Product limit reached', 402));
  }

  return next();
}
