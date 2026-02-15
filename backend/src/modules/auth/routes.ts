import { Router } from 'express';
import { rateLimiters } from '../../middlewares';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import {
  refreshController,
  logoutController,
  authenticateController,
  staffLoginController,
  staffMeController,
  staffLogoutController,
} from './controller';
import {
  registerWithOTPController,
  verifySignupOTPController,
  resendOTPController,
  loginWithPasswordController,
  forgotPasswordOTPController,
  verifyResetOTPController,
  resetPasswordWithTokenController,
} from './otp-controller';
import {
  forgotPasswordSchema,
  staffLoginSchema,
  registerWithOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
  loginWithPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordWithTokenSchema,
} from './schema';

export function authRoutes() {
  const router = Router();
  router.use(rateLimiters.auth);

  // Core auth flow (OTP-based)
  router.post('/register', validateBody(registerWithOTPSchema), registerWithOTPController);
  router.post('/verify-register-otp', validateBody(verifyOTPSchema), verifySignupOTPController);
  router.post('/resend-register-otp', validateBody(resendOTPSchema), resendOTPController);
  router.post('/resend-otp', validateBody(resendOTPSchema), resendOTPController);
  router.post('/login', validateBody(loginWithPasswordSchema), loginWithPasswordController);
  router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordOTPController);
  router.post('/verify-forgot-password-otp', validateBody(verifyResetOTPSchema), verifyResetOTPController);
  router.post('/reset-password', validateBody(resetPasswordWithTokenSchema), resetPasswordWithTokenController);

  // Session endpoints
  router.post('/refresh', refreshController);
  router.get('/me', authMiddleware, authenticateController);
  router.post('/logout', logoutController);

  // Staff auth
  router.post('/staff/login', validateBody(staffLoginSchema), staffLoginController);
  router.get('/staff/me', authMiddleware, staffMeController);
  router.post('/staff/logout', staffLogoutController);

  // Backward-compatible aliases
  router.post('/waiter/login', validateBody(staffLoginSchema), staffLoginController);
  router.get('/waiter/me', authMiddleware, staffMeController);
  router.post('/waiter/logout', staffLogoutController);

  return router;
}
