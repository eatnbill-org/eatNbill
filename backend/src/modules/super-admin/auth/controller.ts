import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

/**
 * POST /super-admin/auth/login - Super admin login with email/password
 */
export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await service.loginSuperAdmin(email, password);
    
    // Set auth cookies
    res.cookie('sa_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'lax' in dev for cross-port
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie('sa_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'lax' in dev for cross-port
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return res.json({
      success: true,
      admin: result.admin,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/refresh - Refresh access token
 */
export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.sa_refresh_token || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: { code: 'REFRESH_FAILED', message: 'No refresh token provided' }
      });
    }
    
    const result = await service.refreshSession(refreshToken);
    
    // Update access token cookie
    res.cookie('sa_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'lax' in dev for cross-port
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    return res.json({
      success: true,
      accessToken: result.accessToken,
      admin: result.admin,
    });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * GET /super-admin/auth/me - Get current super admin info
 */
export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    // This endpoint requires the superAdminAuthMiddleware to be applied
    if (!req.adminUser) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
    }
    
    const admin = await service.getAdminById(req.adminUser.adminId);
    
    return res.json({
      success: true,
      admin,
    });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/logout - Logout super admin
 */
export async function logoutController(_req: Request, res: Response, next: NextFunction) {
  try {
    // Clear auth cookies
    res.clearCookie('sa_access_token');
    res.clearCookie('sa_refresh_token');
    
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error as Error);
  }
}
