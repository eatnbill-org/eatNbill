import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../utils/prisma';
import { signLocalJwt, verifyLocalJwt } from '../../utils/jwt';
import { comparePassword, hashPassword } from '../../utils/hash';
import { supabaseAdmin } from '../../utils/supabase';
import { invalidateUserCache } from '../../middlewares/auth.middleware';
import { sendEmailChangeOTPEmail } from '../../utils/email-helpers';
import {
  clearPendingEmailChange,
  confirmEmailChange,
  createAuditLog,
  getUserRestaurants,
  incrementEmailChangeAttempts,
  setPendingEmailChange,
  updateUserPassword,
} from './repository';

const EMAIL_CHANGE_EXPIRY_MINUTES = 15;
const EMAIL_CHANGE_COOLDOWN_MINUTES = 1;
const MAX_EMAIL_CHANGE_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function canRequestEmailChangeOTP(user: {
  email_change_last_sent_at: Date | null;
}) {
  if (!user.email_change_last_sent_at) {
    return { allowed: true as const };
  }

  const now = Date.now();
  const sentAt = new Date(user.email_change_last_sent_at).getTime();
  const cooldownMs = EMAIL_CHANGE_COOLDOWN_MINUTES * 60 * 1000;

  if (now - sentAt < cooldownMs) {
    return {
      allowed: false as const,
      remainingSeconds: Math.ceil((cooldownMs - (now - sentAt)) / 1000),
    };
  }

  return { allowed: true as const };
}

function generateSixDigitOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Refresh tokens using local JWT verification.
 */
export async function refreshSession(refreshToken: string) {
  try {
    const payload = verifyLocalJwt(refreshToken);

    if (payload.type !== 'refresh') {
      throw new AppError('TOKEN_REFRESH_FAILED', 'Invalid token type', 401);
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, deleted_at: null, is_active: true },
      select: {
        id: true,
        tenant_id: true,
        role: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      throw new AppError('TOKEN_REFRESH_FAILED', 'User not found or inactive', 401);
    }

    const allowedRestaurantIds = await getUserRestaurants(
      user.id,
      user.tenant_id,
      user.role === 'OWNER'
    );

    const accessToken = signLocalJwt(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
      },
      'access'
    );

    const newRefreshToken = signLocalJwt(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
      },
      'refresh'
    );

    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      user: {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        allowed_restaurant_ids: allowedRestaurantIds,
        email: user.email,
        phone: user.phone,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('TOKEN_REFRESH_FAILED', 'Failed to refresh session', 401);
  }
}

/**
 * Logout for stateless JWT auth.
 * Cookies are cleared in controller.
 */
export async function signOut() {
  return { success: true, message: 'Logged out successfully' };
}

export async function verifyCurrentPassword(userId: string, currentPassword: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null, is_active: true },
    select: {
      id: true,
      password_hash: true,
    },
  });

  if (!user || !user.password_hash) {
    throw new AppError('UNAUTHORIZED', 'User not found', 404);
  }

  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 400);
  }

  return { success: true, message: 'Password verified successfully' };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null, is_active: true },
    select: {
      id: true,
      tenant_id: true,
      password_hash: true,
    },
  });

  if (!user || !user.password_hash) {
    throw new AppError('UNAUTHORIZED', 'User not found', 404);
  }

  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 400);
  }

  const nextHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, nextHash);
  await createAuditLog(user.tenant_id, user.id, 'PASSWORD_CHANGED', 'USER', user.id);

  return { success: true, message: 'Password changed successfully' };
}

export async function requestEmailChange(userId: string, currentPassword: string, newEmail: string) {
  const normalizedEmail = normalizeEmail(newEmail);
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null, is_active: true },
    select: {
      id: true,
      tenant_id: true,
      email: true,
      password_hash: true,
      email_change_last_sent_at: true,
    },
  });

  if (!user || !user.password_hash) {
    throw new AppError('UNAUTHORIZED', 'User not found', 404);
  }

  if (normalizedEmail === user.email.toLowerCase()) {
    throw new AppError('INVALID_REQUEST', 'New email must be different from current email', 400);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
      NOT: { id: user.id },
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError('CONFLICT', 'This email is already in use', 409);
  }

  const passwordMatches = await comparePassword(currentPassword, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 400);
  }

  const rateLimit = canRequestEmailChangeOTP(user);
  if (!rateLimit.allowed) {
    throw new AppError(
      'RATE_LIMITED',
      `Please wait ${rateLimit.remainingSeconds} seconds before requesting another code`,
      429
    );
  }

  const otp = generateSixDigitOTP();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MINUTES * 60 * 1000);

  await setPendingEmailChange(user.id, normalizedEmail, otp, expiresAt);

  try {
    await sendEmailChangeOTPEmail(normalizedEmail, user.email, otp, EMAIL_CHANGE_EXPIRY_MINUTES);
  } catch (error) {
    await clearPendingEmailChange(user.id);

    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        message: `[DEV MODE] OTP sent: ${otp}`,
        pendingEmail: normalizedEmail,
        expiresAt,
      };
    }

    throw new AppError(
      'EMAIL_SEND_FAILED',
      'Failed to send verification code to the new email address',
      500
    );
  }

  await invalidateUserCache(user.id);
  await createAuditLog(user.tenant_id, user.id, 'EMAIL_CHANGE_REQUESTED', 'USER', user.id, {
    pending_email_change: normalizedEmail,
  });

  return {
    success: true,
    message: 'Verification code sent to your new email address',
    pendingEmail: normalizedEmail,
    expiresAt,
  };
}

export async function verifyEmailChange(userId: string, otp: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null, is_active: true },
    select: {
      id: true,
      tenant_id: true,
      role: true,
      email: true,
      phone: true,
      supabase_id: true,
      pending_email_change: true,
      email_change_otp: true,
      email_change_expires_at: true,
      email_change_attempts: true,
    },
  });

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'User not found', 404);
  }

  if (!user.pending_email_change || !user.email_change_otp || !user.email_change_expires_at) {
    throw new AppError('INVALID_REQUEST', 'No pending email change request found', 400);
  }

  if (new Date(user.email_change_expires_at) < new Date()) {
    throw new AppError('OTP_EXPIRED', 'Verification code has expired. Start again to request a new code.', 400);
  }

  if (user.email_change_attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
    throw new AppError('TOO_MANY_ATTEMPTS', 'Too many invalid attempts. Start again to request a new code.', 429);
  }

  if (user.email_change_otp !== otp) {
    await incrementEmailChangeAttempts(user.id);
    const remainingAttempts = MAX_EMAIL_CHANGE_ATTEMPTS - (user.email_change_attempts + 1);
    throw new AppError('INVALID_OTP', `Invalid verification code. ${remainingAttempts} attempts remaining.`, 400);
  }

  const emailTaken = await prisma.user.findFirst({
    where: {
      email: user.pending_email_change,
      deleted_at: null,
      NOT: { id: user.id },
    },
    select: { id: true },
  });

  if (emailTaken) {
    throw new AppError('CONFLICT', 'This email is already in use', 409);
  }

  if (user.supabase_id) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.supabase_id, {
      email: user.pending_email_change,
      email_confirm: true,
    });

    if (error) {
      throw new AppError('EMAIL_CHANGE_FAILED', error.message || 'Failed to sync email with auth provider', 400);
    }
  }

  const previousEmail = user.email;
  const updatedUser = await confirmEmailChange(user.id, user.pending_email_change);
  await invalidateUserCache(user.id);
  await createAuditLog(user.tenant_id, user.id, 'EMAIL_CHANGED', 'USER', user.id, {
    previous_email: previousEmail,
    next_email: updatedUser.email,
  });

  const allowedRestaurantIds = await getUserRestaurants(
    user.id,
    user.tenant_id,
    user.role === 'OWNER'
  );

  return {
    success: true,
    message: 'Email changed successfully',
    user: {
      userId: updatedUser.id,
      tenantId: user.tenant_id,
      role: user.role,
      allowed_restaurant_ids: allowedRestaurantIds,
      email: updatedUser.email,
      phone: user.phone,
    },
  };
}
