import type { Request, Response, NextFunction } from 'express';
import {
  registerWithOTP,
  verifySignupOTP,
  resendOTP,
  loginWithPassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from './otp-service';
import { setAuthCookies } from './cookies';

/**
 * POST /auth/register - Register with OTP verification
 */
export async function registerWithOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, phone, password, restaurantName, tenantId } = req.body;
    const result = await registerWithOTP(email, phone, password, restaurantName, tenantId);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/verify-register-otp - Verify signup OTP
 */
export async function verifySignupOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, otp } = req.body;
    const result = await verifySignupOTP(email, otp);
    
    // Set auth cookies
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        restaurantId: result.user.allowed_restaurant_ids?.[0] || null,
        tenantId: result.user.tenantId || null,
      });
    }
    
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/resend-register-otp - Resend OTP
 */
export async function resendOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, type = 'signup' } = req.body;
    const result = await resendOTP(email, type);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/login - Login with email and password
 */
export async function loginWithPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    const result = await loginWithPassword(email, password);
    
    // Set auth cookies
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      restaurantId: result.user.allowed_restaurant_ids?.[0] || null,
      tenantId: result.user.tenantId || null,
    });
    
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/forgot-password - Request password reset OTP
 */
export async function forgotPasswordOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email } = req.body;
    const result = await forgotPassword(email);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/verify-forgot-password-otp - Verify password reset OTP
 */
export async function verifyResetOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, otp } = req.body;
    const result = await verifyResetOTP(email, otp);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/reset-password - Reset password with verified token
 */
export async function resetPasswordWithTokenController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await resetPassword(resetToken, newPassword);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
