import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { prisma } from '../utils/prisma';
import type { Role } from './require-role.middleware';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  req.tenantId = req.user.tenantId;

  console.log(`[TenantMiddleware] Processing request for User: ${req.user.userId}, Role: ${req.user.role}`);

  const restaurantId = req.get('x-restaurant-id');

  if (restaurantId) {
    console.log(`[TenantMiddleware] Restaurant ID provided in header: ${restaurantId}`);

    let allowed = req.user.allowedRestaurantIds.includes(restaurantId);
    let role = req.user.restaurantRoles?.[restaurantId];

    // Handle Stale Cache for OWNER: If not allowed in cache, check DB
    if (!allowed && req.user.role === 'OWNER') {
      console.log(`[TenantMiddleware] OWNER accessing restaurant ${restaurantId} not in cache. Checking DB...`);
      const restaurant = await prisma.restaurant.findFirst({
        where: { id: restaurantId, tenant_id: req.user.tenantId, deleted_at: null },
        select: { id: true }
      });

      if (restaurant) {
        console.log(`[TenantMiddleware] Restaurant ${restaurantId} verified in DB. Allowing access.`);
        allowed = true;
        role = 'OWNER';
        // Critical: Update the allowed list so downstream controllers don't fail
        req.user.allowedRestaurantIds.push(restaurantId);
      } else {
        console.log(`[TenantMiddleware] Restaurant ${restaurantId} not found in DB for tenant ${req.user.tenantId}.`);
      }
    }

    if (!allowed) {
      console.error(`[TenantMiddleware] Access denied. User allowed IDs: ${JSON.stringify(req.user.allowedRestaurantIds)}`);
      return next(new AppError('FORBIDDEN', `Restaurant access denied (ID: ${restaurantId})`, 403));
    }

    req.restaurantId = restaurantId;

    // Resolve role (already resolved for OWNER fallback above)
    if (!role) {
      const rawRole = req.user.restaurantRoles?.[restaurantId];
      role = rawRole === 'ADMIN' ? 'OWNER' : rawRole;
    }

    console.log(`[TenantMiddleware] Resolved Role for Restaurant ${restaurantId}: ${role}`);

    if (!role) {
      console.error(`[TenantMiddleware] No role assigned for restaurant ${restaurantId}`);
      return next(new AppError('FORBIDDEN', `Restaurant role not assigned for ${restaurantId}`, 403));
    }

    req.user.restaurantRole = role as Role;
  } else {
    // NO restaurant ID header provided - auto-set for OWNER/MANAGER users if they have exactly one restaurant
    if ((req.user.role === 'OWNER' || req.user.role === 'MANAGER') && req.user.allowedRestaurantIds.length > 0) {
      const restaurantId = req.user.allowedRestaurantIds[0];
      if (!restaurantId) {
        return next(new AppError('FORBIDDEN', 'No accessible restaurant found', 403));
      }
      console.log(`[TenantMiddleware] Auto-setting Restaurant ID: ${restaurantId}`);
      req.restaurantId = restaurantId;

      const rawRole = req.user.restaurantRoles?.[restaurantId];
      const role = rawRole === 'ADMIN' ? 'OWNER' : (rawRole || req.user.role);
      req.user.restaurantRole = role as Role;

      console.log(`[TenantMiddleware] Auto-set Role: ${req.user.restaurantRole}`);
    } else {
      console.log(`[TenantMiddleware] No restaurant ID provided and could not auto-set. User Role: ${req.user.role}, Allowed Rest: ${req.user.allowedRestaurantIds.length}`);
    }
  }

  return next();
}
