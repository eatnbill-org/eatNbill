import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { rateLimiters } from '../../middlewares';
import { requireRole } from '../../middlewares/require-role.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import {
  createUserController,
  deleteUserController,
  listUsersController,
  updateUserController,
} from './controller';
import { createUserSchema, updateUserSchema } from './schema';

export function userRoutes() {
  const router = Router();

  router.get(
    '/',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER'),
    listUsersController
  );

  router.post(
    '/',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER'),
    validateBody(createUserSchema),
    createUserController
  );

  router.patch(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER'),
    validateBody(updateUserSchema),
    updateUserController
  );

  router.delete(
    '/:id',
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER'),
    deleteUserController
  );

  return router;
}
