import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../utils/prisma';
import { signLocalJwt, verifyLocalJwt } from '../../utils/jwt';
import { comparePassword, hashPassword } from '../../utils/hash';
import { createAuditLog, getUserRestaurants, updateUserPassword } from './repository';

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
