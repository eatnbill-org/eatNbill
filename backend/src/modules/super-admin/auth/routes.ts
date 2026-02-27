import { Router } from 'express';
import { rateLimiters } from '../../../middlewares';
import { validateBody } from '../../../middlewares/validation.middleware';
import { superAdminAuthMiddleware } from '../middleware';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
} from './controller';
import {
  loginSchema,
} from './schema';

export function superAdminAuthRoutes() {
  const router = Router();

  // Public authentication endpoints
  router.post('/login', validateBody(loginSchema), loginController);
  router.post('/refresh', refreshController);
  router.post('/logout', logoutController);
  
  // Protected endpoint - requires valid token
  router.get('/me', superAdminAuthMiddleware, meController);

  return router;
}
