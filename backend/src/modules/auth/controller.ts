import type { Request, Response, NextFunction } from 'express';
import { refreshSession, signOut } from './service';
import { clearAuthCookies, setAuthCookies, REFRESH_TOKEN_COOKIE } from './cookies';
import * as staffAuthService from './staff-auth.service';

/**
 * POST /auth/refresh - Refresh access token using refresh token
 */
export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: bodyRefreshToken } = req.body as { refreshToken?: string };
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || bodyRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: { code: 'REFRESH_FAILED', message: 'Not authenticated' }
      });
    }

    const result = await refreshSession(refreshToken);
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      restaurantId: result.user.allowed_restaurant_ids?.[0] || null,
      tenantId: result.user.tenantId || null,
    });
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * GET /auth/me - Get current user info (authenticated)
 */
export async function authenticateController(req: Request, res: Response, next: NextFunction) {
  try {
    // User is already authenticated via auth middleware
    // req.user contains the authenticated user context
    return res.json({
      user: {
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        role: req.user!.role,
        allowed_restaurant_ids: req.user!.allowedRestaurantIds,
      },
    });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /auth/logout - Sign out
 */
export async function logoutController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signOut();
    clearAuthCookies(res);
    return res.json(result);
  } catch (error) {
    clearAuthCookies(res);
    return next(error as Error);
  }
}

/**
 * POST /auth/staff/login - Staff login
 */
export async function staffLoginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await staffAuthService.loginStaff(email, password);

    // Set auth cookies (same as admin)
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      restaurantId: result.restaurant.id,
      tenantId: result.restaurant.tenantId,
    });

    return res.json({
      success: true,
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      staff: result.staff,
      restaurant: result.restaurant,
    });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * GET /auth/staff/me - Get current staff info (uses auth middleware)
 */
export async function staffMeController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
    }

    const result = await staffAuthService.getStaffMe(req.user.userId);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /auth/staff/logout - Staff logout
 */
export async function staffLogoutController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await staffAuthService.logoutStaff();
    
    // Clear auth cookies
    clearAuthCookies(res);
    
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}
