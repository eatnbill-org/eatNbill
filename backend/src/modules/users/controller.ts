import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { changeUserRole, inviteUser, listTenantUsers, removeUser } from './service';

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const users = await listTenantUsers(req.user.tenantId);
    return res.json({ users });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { email, role } = req.body as { email: string; role: 'MANAGER' | 'WAITER' };
    const user = await inviteUser(req.user.tenantId, req.user.userId, email, role);
    return res.status(201).json(user);
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { role } = req.body as { role: 'MANAGER' | 'WAITER' };
    const updated = await changeUserRole(req.user.tenantId, req.user.userId, req.params.id as string, role);
    return res.json(updated);
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const result = await removeUser(req.user.tenantId, req.user.userId, req.params.id as string);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}
