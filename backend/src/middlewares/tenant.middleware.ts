import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import type { Role } from './require-role.middleware';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  req.tenantId = req.user.tenantId;
  // console.log('[Tenant Middleware] Set tenant ID:', req.tenantId);

  const restaurantId = req.get('x-restaurant-id');

  if (restaurantId) {
    const allowed = req.user.allowedRestaurantIds.includes(restaurantId);
    if (!allowed) {
      return next(new AppError('FORBIDDEN', 'Restaurant access denied', 403));
    }

    req.restaurantId = restaurantId;

    // ✅ FIX #6: Use role from auth middleware (no DB query needed)
    const rawRole = req.user.restaurantRoles?.[restaurantId];
    const role = rawRole === 'ADMIN' ? 'OWNER' : rawRole;

    if (!role) {
      return next(new AppError('FORBIDDEN', 'Restaurant role not assigned', 403));
    }

    req.user.restaurantRole = role as Role;
  } else {
    // NO restaurant ID header provided - auto-set for OWNER/MANAGER users if they have exactly one restaurant
    if ((req.user.role === 'OWNER' || req.user.role === 'MANAGER') && req.user.allowedRestaurantIds.length > 0) {
      const restaurantId = req.user.allowedRestaurantIds[0];
      req.restaurantId = restaurantId;

      const rawRole = req.user.restaurantRoles?.[restaurantId];
      const role = rawRole === 'ADMIN' ? 'OWNER' : (rawRole || req.user.role);
      req.user.restaurantRole = role as Role;
    }
  }

  return next();
}
