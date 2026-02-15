import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export type RestaurantRole = 'OWNER' | 'MANAGER' | 'WAITER';

export function requireRestaurantRole(...allowed: RestaurantRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.restaurantRole;
    if (!role || !allowed.includes(role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient restaurant role', 403));
    }

    return next();
  };
}