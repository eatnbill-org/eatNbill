import { prisma } from '../../utils/prisma';

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findFirst({
    where: { phone, deleted_at: null },
  });
}

export async function findUserByEmailOrPhone(
  email?: string | null,
  phone?: string | null
) {
  return prisma.user.findFirst({
    where: {
      deleted_at: null,
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean) as any,
    },
  });
}


export async function getUserRestaurants(userId: string, tenantId: string, isOwner: boolean) {
  if (isOwner) {
    const restaurants = await prisma.restaurant.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      select: { id: true },
    });
    return restaurants.map((r: { id: any; }) => r.id);
  }

  const assignments = await prisma.restaurantUser.findMany({
    where: { user_id: userId, is_active: true },
    select: { restaurant_id: true },
  });
  return assignments.map((a: { restaurant_id: any; }) => a.restaurant_id);
}

export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: userId ?? undefined,
      action,
      entity,
      entity_id: entityId,
      metadata: metadata as any,
    },
  });
}

/**
 * Update user OTP and tracking fields
 */
export async function updateUserOTP(
  userId: string, 
  otp: string, 
  expiresAt: Date
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      otp,
      otp_expires_at: expiresAt,
      last_otp_sent_at: new Date(),
      otp_attempts: 0, // Reset attempts on new OTP
    },
  });
}

/**
 * Increment OTP attempts for rate limiting
 */
export async function incrementOTPAttempts(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      otp_attempts: { increment: 1 },
    },
  });
}

/**
 * Verify email after OTP confirmation
 */
export async function markEmailAsVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      email_verified: true,
      otp: null,
      otp_expires_at: null,
      otp_attempts: 0,
    },
  });
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      password_hash: passwordHash,
      otp: null,
      otp_expires_at: null,
      otp_attempts: 0,
    },
  });
}

export async function setPendingEmailChange(userId: string, pendingEmail: string, otp: string, expiresAt: Date) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      pending_email_change: pendingEmail,
      email_change_otp: otp,
      email_change_expires_at: expiresAt,
      email_change_attempts: 0,
      email_change_last_sent_at: new Date(),
    },
  });
}

export async function incrementEmailChangeAttempts(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      email_change_attempts: { increment: 1 },
    },
  });
}

export async function clearPendingEmailChange(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      pending_email_change: null,
      email_change_otp: null,
      email_change_expires_at: null,
      email_change_attempts: 0,
      email_change_last_sent_at: null,
    },
  });
}

export async function confirmEmailChange(userId: string, email: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      email,
      email_verified: true,
      pending_email_change: null,
      email_change_otp: null,
      email_change_expires_at: null,
      email_change_attempts: 0,
      email_change_last_sent_at: null,
    },
  });
}
