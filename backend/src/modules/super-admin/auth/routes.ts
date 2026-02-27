import { Router } from 'express';
import { rateLimiters } from '../../../middlewares';
import { validateBody } from '../../../middlewares/validation.middleware';
import { superAdminAuthMiddleware } from '../middleware';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  verifyTotpLoginController,
  updateProfileController,
  changePasswordController,
  changeEmailController,
  setup2faController,
  enable2faController,
  disable2faController,
} from './controller';
import {
  loginSchema,
  verifyTotpLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
  enable2faSchema,
  disable2faSchema,
} from './schema';

export function superAdminAuthRoutes() {
  const router = Router();

  // Public authentication endpoints
  router.post('/login', validateBody(loginSchema), loginController);
  router.post('/2fa/verify-login', validateBody(verifyTotpLoginSchema), verifyTotpLoginController);
  router.post('/refresh', refreshController);
  router.post('/logout', logoutController);

  // Protected endpoint - requires valid token
  router.get('/me', superAdminAuthMiddleware, meController);

  // Protected profile/settings endpoints
  router.patch('/profile', superAdminAuthMiddleware, validateBody(updateProfileSchema), updateProfileController);
  router.patch('/change-password', superAdminAuthMiddleware, validateBody(changePasswordSchema), changePasswordController);
  router.patch('/change-email', superAdminAuthMiddleware, validateBody(changeEmailSchema), changeEmailController);

  // 2FA endpoints
  router.post('/2fa/setup', superAdminAuthMiddleware, setup2faController);
  router.post('/2fa/enable', superAdminAuthMiddleware, validateBody(enable2faSchema), enable2faController);
  router.delete('/2fa/disable', superAdminAuthMiddleware, validateBody(disable2faSchema), disable2faController);

  return router;
}

