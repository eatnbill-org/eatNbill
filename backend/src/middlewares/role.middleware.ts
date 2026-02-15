import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export type Role = 'OWNER' | 'MANAGER' | 'WAITER';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient role', 403));
    }

    return next();
  };
}
