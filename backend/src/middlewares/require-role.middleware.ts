import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

/**
 * Unified Role Type - Used at both tenant and restaurant levels
 * OWNER: Tenant owner OR restaurant owner/admin
 * MANAGER: Mid-level management at tenant or restaurant
 * WAITER: Staff member / waiter
 */
export type Role = 'OWNER' | 'MANAGER' | 'WAITER';

/**
 * Unified role checker middleware
 * Checks EITHER tenant-level role (req.user.role) OR restaurant-level role (req.user.restaurantRole)
 * depending on which is available in the request context.
 * 
 * Usage:
 *   requireRole('OWNER') - Only tenant/restaurant owners
 *   requireRole('OWNER', 'MANAGER') - Owners and managers
 *   requireRole('OWNER', 'MANAGER', 'WAITER') - All roles
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Check restaurant-level role first (if restaurant context is active)
    const restaurantRole = req.user?.restaurantRole as Role | undefined;
    const tenantRole = req.user?.role as Role | undefined;

    console.log(`[RequireRole] Checking roles. User Restaurant Role: ${restaurantRole}, Tenant Role: ${tenantRole}. Allowed: ${allowed.join(', ')}`);

    if (restaurantRole && allowed.includes(restaurantRole)) {
      console.log(`[RequireRole] Granted via Restaurant Role`);
      return next();
    }

    // Fallback to tenant-level role
    if (tenantRole && allowed.includes(tenantRole)) {
      console.log(`[RequireRole] Granted via Tenant Role`);
      return next();
    }

    console.error(`[RequireRole] Access Denied. Required one of: ${allowed.join(', ')}`);

    // No matching role found
    return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
  };
}
