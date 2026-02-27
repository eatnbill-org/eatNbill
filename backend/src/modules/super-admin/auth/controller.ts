import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

/**
 * POST /super-admin/auth/login - Super admin login with email/password
 */
export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await service.loginSuperAdmin(email, password);

    if (result.requiresTOTP) {
      // 2FA required - return temp token, don't set cookies yet
      return res.json({ success: true, requiresTOTP: true, tempToken: result.tempToken });
    }

    // Set auth cookies
    res.cookie('sa_access_token', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('sa_refresh_token', result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, requiresTOTP: false, admin: result.admin });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/2fa/verify-login - Complete login with TOTP code
 */
export async function verifyTotpLoginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken, totpCode } = req.body as { tempToken: string; totpCode: string };
    const result = await service.verifyTotpLogin(tempToken, totpCode);

    res.cookie('sa_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('sa_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, admin: result.admin });
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
      return res.status(401).json({ error: { code: 'REFRESH_FAILED', message: 'No refresh token provided' } });
    }

    const result = await service.refreshSession(refreshToken);

    res.cookie('sa_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ success: true, accessToken: result.accessToken, admin: result.admin });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * GET /super-admin/auth/me - Get current super admin info
 */
export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }
    const admin = await service.getAdminById(req.adminUser.adminId);
    return res.json({ success: true, admin });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/logout - Logout super admin
 */
export async function logoutController(_req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie('sa_access_token');
    res.clearCookie('sa_refresh_token');
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * PATCH /super-admin/auth/profile - Update profile name
 */
export async function updateProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const { name } = req.body as { name: string };
    const admin = await service.updateProfile(req.adminUser.adminId, name);
    return res.json({ success: true, admin });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * PATCH /super-admin/auth/change-password - Change password
 */
export async function changePasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    await service.changePassword(req.adminUser.adminId, currentPassword, newPassword);
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * PATCH /super-admin/auth/change-email - Change email with password confirmation
 */
export async function changeEmailController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const { newEmail, password } = req.body as { newEmail: string; password: string };
    const admin = await service.changeEmail(req.adminUser.adminId, newEmail, password);
    return res.json({ success: true, admin, message: 'Email changed successfully' });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/2fa/setup - Generate TOTP secret and QR code
 */
export async function setup2faController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const result = await service.setup2fa(req.adminUser.adminId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * POST /super-admin/auth/2fa/enable - Enable 2FA by verifying TOTP code
 */
export async function enable2faController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const { totpCode } = req.body as { totpCode: string };
    await service.enable2fa(req.adminUser.adminId, totpCode);
    return res.json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (error) {
    return next(error as Error);
  }
}

/**
 * DELETE /super-admin/auth/2fa/disable - Disable 2FA
 */
export async function disable2faController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.adminUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    const { password, totpCode } = req.body as { password: string; totpCode: string };
    await service.disable2fa(req.adminUser.adminId, password, totpCode);
    return res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (error) {
    return next(error as Error);
  }
}
