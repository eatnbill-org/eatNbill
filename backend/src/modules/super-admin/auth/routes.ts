import { Router } from 'express';
import { rateLimiters } from '../../middlewares';
import { validateBody } from '../../middlewares/validation.middleware';
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
  router.use(rateLimiters.auth);

  // Authentication endpoints
  router.post('/login', validateBody(loginSchema), loginController);
  router.post('/refresh', refreshController);
  router.get('/me', meController);
  router.post('/logout', logoutController);

  return router;
}
