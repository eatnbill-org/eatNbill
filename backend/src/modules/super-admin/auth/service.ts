import { compare, hash } from 'bcrypt';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../utils/prisma';
import { signLocalJwt, verifyLocalJwt } from '../../../utils/jwt';
import { AppError } from '../../../middlewares/error.middleware';
import { logSuperAdminAction } from '../middleware';
import { env } from '../../../env';

const SALT_ROUNDS = 10;

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface LoginResponse {
  requiresTOTP: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  admin?: { id: string; email: string; name: string | null };
}

/**
 * Login super admin with email and password.
 * If 2FA is enabled, returns tempToken and requiresTOTP:true.
 */
export async function loginSuperAdmin(email: string, password: string): Promise<LoginResponse> {
  const admin = await prisma.adminUser.findFirst({
    where: { email: email.toLowerCase(), is_active: true, deleted_at: null },
  });

  if (!admin) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

  const isValidPassword = await compare(password, admin.password_hash || '');
  if (!isValidPassword) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

  if (admin.totp_enabled && admin.totp_secret) {
    const tempToken = jwt.sign(
      { adminId: admin.id, type: 'totp_pending' },
      env.JWT_SECRET,
      { expiresIn: '5m', issuer: 'eatnbill-api', audience: 'eatnbill-app' }
    );
    return { requiresTOTP: true, tempToken };
  }

  await logSuperAdminAction(admin.id, 'LOGIN', 'ADMIN_USER', admin.id, undefined, {});

  const accessToken = signLocalJwt(
    { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
    'access'
  );
  const refreshToken = signLocalJwt(
    { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
    'refresh'
  );

  return {
    requiresTOTP: false,
    accessToken,
    refreshToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  };
}

/**
 * Complete login by verifying TOTP code with the temp token from step 1.
 */
export async function verifyTotpLogin(tempToken: string, totpCode: string): Promise<LoginResult> {
  let payload: { adminId: string; type: string };
  try {
    payload = jwt.verify(tempToken, env.JWT_SECRET, {
      issuer: 'eatnbill-api',
      audience: 'eatnbill-app',
    }) as any;
  } catch {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired verification token', 401);
  }

  if (payload.type !== 'totp_pending') {
    throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
  }

  const admin = await prisma.adminUser.findFirst({
    where: { id: payload.adminId, is_active: true, deleted_at: null },
  });

  if (!admin || !admin.totp_secret || !admin.totp_enabled) {
    throw new AppError('INVALID_TOKEN', 'Admin not found or 2FA not enabled', 401);
  }

  const isValid = authenticator.verify({ token: totpCode, secret: admin.totp_secret });
  if (!isValid) throw new AppError('INVALID_TOTP', 'Invalid authenticator code', 401);

  await logSuperAdminAction(admin.id, 'LOGIN', 'ADMIN_USER', admin.id, undefined, { two_factor: true });

  const accessToken = signLocalJwt(
    { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
    'access'
  );
  const refreshToken = signLocalJwt(
    { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
    'refresh'
  );

  return { accessToken, refreshToken, admin: { id: admin.id, email: admin.email, name: admin.name } };
}

/**
 * Refresh session with refresh token
 */
export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  try {
    const payload = verifyLocalJwt(refreshToken);

    if (payload.type !== 'refresh') {
      throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: payload.userId, is_active: true, deleted_at: null },
    });

    if (!admin) throw new AppError('UNAUTHORIZED', 'Admin not found or inactive', 401);

    const newAccessToken = signLocalJwt(
      { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
      'access'
    );
    const newRefreshToken = signLocalJwt(
      { userId: admin.id, tenantId: 'platform', role: 'SUPER_ADMIN' as any, supabaseId: admin.supabase_id },
      'refresh'
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, admin: { id: admin.id, email: admin.email, name: admin.name } };
  } catch (error: any) {
    if (error.message === 'Token expired') {
      throw new AppError('TOKEN_EXPIRED', 'Refresh token expired', 401);
    }
    throw new AppError('INVALID_TOKEN', 'Invalid refresh token', 401);
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(adminId: string) {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      totp_enabled: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);
  return admin;
}

/**
 * Update profile name
 */
export async function updateProfile(adminId: string, name: string) {
  const admin = await prisma.adminUser.update({
    where: { id: adminId },
    data: { name },
    select: { id: true, email: true, name: true, is_active: true, totp_enabled: true, created_at: true, updated_at: true },
  });
  return admin;
}

/**
 * Change password (requires current password verification)
 */
export async function changePassword(adminId: string, currentPassword: string, newPassword: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);

  const isValid = await compare(currentPassword, admin.password_hash || '');
  if (!isValid) throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 400);

  const newHash = await hash(newPassword, SALT_ROUNDS);
  await prisma.adminUser.update({ where: { id: adminId }, data: { password_hash: newHash } });

  await logSuperAdminAction(adminId, 'UPDATE', 'ADMIN_USER', adminId, undefined, { action: 'password_change' });
}

/**
 * Change email (requires password confirmation)
 */
export async function changeEmail(adminId: string, newEmail: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);

  const isValid = await compare(password, admin.password_hash || '');
  if (!isValid) throw new AppError('INVALID_CREDENTIALS', 'Password is incorrect', 400);

  const existing = await prisma.adminUser.findUnique({ where: { email: newEmail.toLowerCase() } });
  if (existing && existing.id !== adminId) throw new AppError('CONFLICT', 'Email already in use', 409);

  const updated = await prisma.adminUser.update({
    where: { id: adminId },
    data: { email: newEmail.toLowerCase() },
    select: { id: true, email: true, name: true, is_active: true, totp_enabled: true, created_at: true, updated_at: true },
  });

  await logSuperAdminAction(adminId, 'UPDATE', 'ADMIN_USER', adminId, undefined, { action: 'email_change', new_email: newEmail.toLowerCase() });
  return updated;
}

/**
 * Setup 2FA - generate TOTP secret and QR code
 */
export async function setup2fa(adminId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);

  const secret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(admin.email, 'EatnBill Super Admin', secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

  // Store the secret but don't enable yet (pending verification)
  await prisma.adminUser.update({ where: { id: adminId }, data: { totp_secret: secret, totp_enabled: false } });

  return { secret, qrCodeDataUrl };
}

/**
 * Enable 2FA - confirm with TOTP code to activate
 */
export async function enable2fa(adminId: string, totpCode: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);
  if (!admin.totp_secret) throw new AppError('BAD_REQUEST', '2FA setup not initiated. Call setup first.', 400);
  if (admin.totp_enabled) throw new AppError('BAD_REQUEST', '2FA is already enabled', 400);

  const isValid = authenticator.verify({ token: totpCode, secret: admin.totp_secret });
  if (!isValid) throw new AppError('INVALID_TOTP', 'Invalid authenticator code. Please try again.', 400);

  await prisma.adminUser.update({
    where: { id: adminId },
    data: { totp_enabled: true, totp_verified_at: new Date() },
  });

  await logSuperAdminAction(adminId, 'UPDATE', 'ADMIN_USER', adminId, undefined, { action: '2fa_enabled' });
}

/**
 * Disable 2FA - requires current password AND current TOTP code
 */
export async function disable2fa(adminId: string, password: string, totpCode: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('NOT_FOUND', 'Admin not found', 404);
  if (!admin.totp_enabled) throw new AppError('BAD_REQUEST', '2FA is not enabled', 400);

  const isValidPassword = await compare(password, admin.password_hash || '');
  if (!isValidPassword) throw new AppError('INVALID_CREDENTIALS', 'Password is incorrect', 400);

  const isValidTotp = authenticator.verify({ token: totpCode, secret: admin.totp_secret! });
  if (!isValidTotp) throw new AppError('INVALID_TOTP', 'Invalid authenticator code', 400);

  await prisma.adminUser.update({
    where: { id: adminId },
    data: { totp_enabled: false, totp_secret: null, totp_verified_at: null },
  });

  await logSuperAdminAction(adminId, 'UPDATE', 'ADMIN_USER', adminId, undefined, { action: '2fa_disabled' });
}

/**
 * Create a new super admin (for seeding)
 */
export async function createSuperAdmin(email: string, password: string, name?: string) {
  const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError('CONFLICT', 'Admin with this email already exists', 409);

  const passwordHash = await hash(password, SALT_ROUNDS);

  const admin = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name || null,
      supabase_id: `local_${Date.now()}`,
      is_active: true,
    },
  });

  return { id: admin.id, email: admin.email, name: admin.name, created_at: admin.created_at };
}
