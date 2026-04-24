import { Router } from 'express';
import { rateLimiters } from '../../middlewares';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import {
  changePasswordController,
  refreshController,
  logoutController,
  authenticateController,
  staffLoginController,
  staffMeController,
  staffLogoutController,
  verifyPasswordController,
  requestEmailChangeController,
  verifyEmailChangeController,
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
  changePasswordSchema,
  forgotPasswordSchema,
  staffLoginSchema,
  registerWithOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
  loginWithPasswordSchema,
  verifyPasswordSchema,
  requestEmailChangeSchema,
  verifyResetOTPSchema,
  verifyEmailChangeSchema,
  resetPasswordWithTokenSchema,
} from './schema';

export function authRoutes() {
  const router = Router();
  router.use(rateLimiters.auth);

  // Core auth flow (OTP-based)
  router.post('/register', rateLimiters.authSensitive, validateBody(registerWithOTPSchema), registerWithOTPController);
  router.post('/verify-register-otp', rateLimiters.authSensitive, validateBody(verifyOTPSchema), verifySignupOTPController);
  router.post('/resend-register-otp', rateLimiters.authSensitive, validateBody(resendOTPSchema), resendOTPController);
  router.post('/resend-otp', rateLimiters.authSensitive, validateBody(resendOTPSchema), resendOTPController);
  router.post('/login', rateLimiters.authSensitive, validateBody(loginWithPasswordSchema), loginWithPasswordController);
  router.post('/forgot-password', rateLimiters.authSensitive, validateBody(forgotPasswordSchema), forgotPasswordOTPController);
  router.post('/verify-forgot-password-otp', rateLimiters.authSensitive, validateBody(verifyResetOTPSchema), verifyResetOTPController);
  router.post('/reset-password', rateLimiters.authSensitive, validateBody(resetPasswordWithTokenSchema), resetPasswordWithTokenController);

  // Session endpoints
  router.post('/refresh', rateLimiters.authSensitive, refreshController);
  router.get('/me', authMiddleware, authenticateController);
  router.post('/verify-password', rateLimiters.authSensitive, authMiddleware, validateBody(verifyPasswordSchema), verifyPasswordController);
  router.patch('/change-password', authMiddleware, validateBody(changePasswordSchema), changePasswordController);
  router.post('/change-email/request', rateLimiters.authSensitive, authMiddleware, validateBody(requestEmailChangeSchema), requestEmailChangeController);
  router.post('/change-email/verify', rateLimiters.authSensitive, authMiddleware, validateBody(verifyEmailChangeSchema), verifyEmailChangeController);
  router.post('/logout', logoutController);

  // Staff auth
  router.post('/staff/login', rateLimiters.authSensitive, validateBody(staffLoginSchema), staffLoginController);
  router.get('/staff/me', authMiddleware, staffMeController);
  router.post('/staff/logout', staffLogoutController);

  // Backward-compatible aliases
  router.post('/waiter/login', rateLimiters.authSensitive, validateBody(staffLoginSchema), staffLoginController);
  router.get('/waiter/me', authMiddleware, staffMeController);
  router.post('/waiter/logout', staffLogoutController);

  return router;
}
