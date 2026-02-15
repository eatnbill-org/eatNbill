/**
 * OTP-based Authentication Service
 * Replaces Supabase Auth email verification with custom OTP flow
 */

import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../utils/prisma';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signLocalJwt, verifyLocalJwt } from '../../utils/jwt';
import {
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
  generateOTPWithExpiry,
} from '../../utils/email-helpers';
import {
  findUserByEmail,
  findUserByEmailOrPhone,
  getUserRestaurants,
  updateUserOTP,
  incrementOTPAttempts,
  markEmailAsVerified,
  updateUserPassword,
  createAuditLog,
} from './repository';

// Rate limiting constants
const MAX_OTP_ATTEMPTS = 5;
const OTP_COOLDOWN_MINUTES = 1; // Cooldown before allowing resend
const OTP_EXPIRY_MINUTES = 15;

/**
 * Normalize email
 */
function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

/**
 * Normalize phone
 */
function normalizePhone(phone?: string | null) {
  return phone?.trim() || null;
}

/**
 * Check if user can request OTP (rate limiting)
 */
function canRequestOTP(user: any): { allowed: boolean; remainingSeconds?: number } {
  if (!user.last_otp_sent_at) {
    return { allowed: true };
  }

  const lastSentAt = new Date(user.last_otp_sent_at).getTime();
  const now = Date.now();
  const cooldownMs = OTP_COOLDOWN_MINUTES * 60 * 1000;
  const timeSinceLastSent = now - lastSentAt;

  if (timeSinceLastSent < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
}

// ==========================================
// REGISTER WITH OTP
// ==========================================

/**
 * Register a new user and send OTP for email verification
 * User account is created but not activated until email is verified
 */
export async function registerWithOTP(
  email: string,
  phone: string | null,
  password: string,
  restaurantName: string,
  tenantId?: string
) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedEmail) {
    throw new AppError('REGISTER_FAILED', 'Email is required', 400);
  }

  // Check if user already exists
  const existingUser = await findUserByEmailOrPhone(
    normalizedEmail,
    normalizedPhone
  );

  if (existingUser) {
    // If email not verified, allow resend
    if (!existingUser.email_verified) {
      // Check rate limiting
      const { allowed, remainingSeconds } = canRequestOTP(existingUser);
      if (!allowed) {
        throw new AppError(
          'RATE_LIMITED',
          `Please wait ${remainingSeconds} seconds before requesting another code`,
          429
        );
      }

      // Always generate a fresh OTP on resend/register retry.
      const { otp, expiresAt } = generateOTPWithExpiry(OTP_EXPIRY_MINUTES);

      await updateUserOTP(existingUser.id, otp, expiresAt);

      // Send email
      try {
        await sendSignupConfirmationEmail(
          normalizedEmail,
          restaurantName,
          otp,
          OTP_EXPIRY_MINUTES
        );
      } catch (emailError) {
        console.error('[Auth] Failed to resend verification email:', emailError);
        
        // In development mode, return OTP in response
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️  [DEV MODE] OTP: ${otp} (expires: ${expiresAt})`);
          return {
            success: true,
            message: `[DEV MODE] OTP resent: ${otp}`,
            userId: existingUser.id,
            email: existingUser.email,
            expiresAt,
          };
        }
        
        throw new AppError(
          'REGISTER_FAILED',
          'Error sending confirmation email. Please check your email configuration and try again.',
          500
        );
      }

      return {
        success: true,
        message: 'Verification code has been resent to your email',
        userId: existingUser.id,
        email: existingUser.email,
        expiresAt,
      };
    }

    throw new AppError(
      'REGISTER_FAILED',
      'User with this email or phone already exists',
      400
    );
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate OTP
  const { otp, expiresAt } = generateOTPWithExpiry(OTP_EXPIRY_MINUTES);

  // Create tenant if not provided
  let finalTenantId = tenantId;
  if (!tenantId) {
    const tenant = await prisma.tenant.create({
      data: {
        name: restaurantName,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
    finalTenantId = tenant.id;
  }

  try {
    // Create user (not verified yet)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        password_hash: passwordHash,
        tenant_id: finalTenantId!,
        role: 'OWNER',
        is_active: true,
        email_verified: false,
        otp,
        otp_expires_at: expiresAt,
        last_otp_sent_at: new Date(),
        otp_attempts: 0,
      },
    });

    // Create first restaurant for OWNER
    if (!tenantId) {
      const slug = restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const restaurant = await prisma.restaurant.create({
        data: {
          name: restaurantName,
          slug: `${slug}-${Date.now().toString().slice(-4)}`,
          tenant_id: finalTenantId!,
          phone: normalizedPhone,
          email: normalizedEmail,
        },
      });

      await prisma.restaurantUser.create({
        data: {
          restaurant_id: restaurant.id,
          user_id: user.id,
          role: 'OWNER',
        },
      });
    }

    // Send verification email
    try {
      await sendSignupConfirmationEmail(
        normalizedEmail,
        restaurantName,
        otp,
        OTP_EXPIRY_MINUTES
      );
    } catch (emailError) {
      // Log the email error
      console.error('[Auth] Failed to send verification email:', emailError);
      
      // In development mode, allow registration to proceed anyway
      if (process.env.NODE_ENV === 'development') {
        console.warn('');
        console.warn('⚠️  [DEV MODE] Continuing registration without email...');
        console.warn(`   OTP Code: ${otp}`);
        console.warn(`   Expires: ${expiresAt}`);
        console.warn('   Use this code to verify your account.');
        console.warn('');
        
        return {
          success: true,
          message: `[DEV MODE] Registration successful. OTP: ${otp} (Configure Resend in env to hide this)`,
          userId: user.id,
          email: user.email,
          expiresAt,
        };
      }
      
      // In production, delete the created user since email failed
      await prisma.user.delete({ where: { id: user.id } });
      
      throw new AppError(
        'REGISTER_FAILED',
        'Error sending confirmation email. Please check your email configuration and try again.',
        500
      );
    }

    return {
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      userId: user.id,
      email: user.email,
      expiresAt,
    };
  } catch (err: any) {
    // Handle UNIQUE constraint violation
    if (err.code === 'P2002') {
      throw new AppError(
        'REGISTER_FAILED',
        'User with this email or phone already exists',
        400
      );
    }

    console.error('[Auth] Registration DB error:', err);
    throw new AppError(
      'REGISTER_FAILED',
      'Registration failed. Please try again.',
      500
    );
  }
}

// ==========================================
// VERIFY SIGNUP OTP
// ==========================================

/**
 * Verify OTP and activate user account
 */
export async function verifySignupOTP(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError('INVALID_REQUEST', 'Email is required', 400);
  }

  // Find user
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Check if already verified
  if (user.email_verified) {
    throw new AppError(
      'ALREADY_VERIFIED',
      'Email is already verified. You can login now.',
      400
    );
  }

  // Check if OTP exists and not expired
  if (!user.otp || !user.otp_expires_at) {
    throw new AppError(
      'OTP_NOT_FOUND',
      'No verification code found. Please request a new one.',
      400
    );
  }

  if (new Date(user.otp_expires_at) < new Date()) {
    throw new AppError(
      'OTP_EXPIRED',
      'Verification code has expired. Please request a new one.',
      400
    );
  }

  // Check attempts
  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(
      'TOO_MANY_ATTEMPTS',
      'Too many failed attempts. Please request a new code.',
      429
    );
  }

  // Verify OTP
  if (user.otp !== otp) {
    await incrementOTPAttempts(user.id);
    const remainingAttempts = MAX_OTP_ATTEMPTS - (user.otp_attempts + 1);

    throw new AppError(
      'INVALID_OTP',
      `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      400
    );
  }

  // Mark email as verified
  await markEmailAsVerified(user.id);

  // Get user context
  const allowedRestaurantIds = await getUserRestaurants(
    user.id,
    user.tenant_id,
    user.role === 'OWNER'
  );

  // Generate JWT tokens
  const accessToken = signLocalJwt(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    },
    'access'
  );

  const refreshToken = signLocalJwt(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    },
    'refresh'
  );

  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes

  // Audit log
  await createAuditLog(user.tenant_id, user.id, 'EMAIL_VERIFIED', 'USER', user.id);

  return {
    success: true,
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
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
}

// ==========================================
// RESEND OTP
// ==========================================

/**
 * Resend OTP (always generates a new OTP)
 */
export async function resendOTP(email: string, type: 'signup' | 'reset' = 'signup') {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError('INVALID_REQUEST', 'Email is required', 400);
  }

  // Find user
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Security: Don't reveal if email exists
    return {
      success: true,
      message: 'If an account exists, a verification code has been sent.',
    };
  }

  // Check if already verified (for signup)
  if (type === 'signup' && user.email_verified) {
    throw new AppError(
      'ALREADY_VERIFIED',
      'Email is already verified. You can login now.',
      400
    );
  }

  // Check rate limiting
  const { allowed, remainingSeconds } = canRequestOTP(user);
  if (!allowed) {
    throw new AppError(
      'RATE_LIMITED',
      `Please wait ${remainingSeconds} seconds before requesting another code`,
      429
    );
  }

  // Always generate a fresh OTP.
  const { otp, expiresAt } = generateOTPWithExpiry(OTP_EXPIRY_MINUTES);

  // Update user
  await updateUserOTP(user.id, otp, expiresAt);

  // Send email
  try {
    if (type === 'signup') {
      await sendSignupConfirmationEmail(
        normalizedEmail,
        user.email, // Use email as name if no name field
        otp,
        OTP_EXPIRY_MINUTES
      );
    } else {
      await sendPasswordResetEmail(
        normalizedEmail,
        user.email,
        otp,
        OTP_EXPIRY_MINUTES
      );
    }
  } catch (emailError) {
    console.error('[Auth] Failed to send OTP email:', emailError);
    
    // In development mode, log OTP
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  [DEV MODE] OTP: ${otp} (expires: ${expiresAt})`);
      return {
        success: true,
        message: `[DEV MODE] OTP: ${otp}`,
        expiresAt,
      };
    }
    
    throw new AppError(
      'EMAIL_SEND_FAILED',
      'Failed to send verification code. Please check email configuration.',
      500
    );
  }

  return {
    success: true,
    message: 'Verification code has been sent to your email',
    expiresAt,
  };
}

// ==========================================
// LOGIN WITH PASSWORD
// ==========================================

/**
 * Login with email and password
 */
export async function loginWithPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError('INVALID_REQUEST', 'Email is required', 400);
  }

  // Find user
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.password_hash) {
    throw new AppError('AUTH_FAILED', 'Invalid email or password', 401);
  }

  // Check if email is verified
  if (!user.email_verified) {
    throw new AppError(
      'EMAIL_NOT_VERIFIED',
      'Please verify your email before logging in. Check your inbox for the verification code.',
      403
    );
  }

  // Check if user is active
  if (!user.is_active) {
    throw new AppError('AUTH_FAILED', 'Account is deactivated', 403);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('AUTH_FAILED', 'Invalid email or password', 401);
  }

  // Get user context
  const allowedRestaurantIds = await getUserRestaurants(
    user.id,
    user.tenant_id,
    user.role === 'OWNER'
  );

  // Generate JWT tokens
  const accessToken = signLocalJwt(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    },
    'access'
  );

  const refreshToken = signLocalJwt(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    },
    'refresh'
  );

  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes

  // Audit log
  await createAuditLog(user.tenant_id, user.id, 'LOGIN', 'USER', user.id);

  return {
    success: true,
    accessToken,
    refreshToken,
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
}

// ==========================================
// FORGOT PASSWORD
// ==========================================

/**
 * Request password reset OTP
 */
export async function forgotPassword(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError('INVALID_REQUEST', 'Email is required', 400);
  }

  // Find user
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Security: Don't reveal if email exists
    return {
      success: true,
      message: 'If an account exists, a password reset code has been sent.',
    };
  }

  // Check rate limiting
  const { allowed, remainingSeconds } = canRequestOTP(user);
  if (!allowed) {
    throw new AppError(
      'RATE_LIMITED',
      `Please wait ${remainingSeconds} seconds before requesting another code`,
      429
    );
  }

  // Generate OTP
  const { otp, expiresAt } = generateOTPWithExpiry(OTP_EXPIRY_MINUTES);

  // Update user
  await updateUserOTP(user.id, otp, expiresAt);

  // Send email
  try {
    await sendPasswordResetEmail(
      normalizedEmail,
      user.email,
      otp,
      OTP_EXPIRY_MINUTES
    );
  } catch (emailError) {
    console.error('[Auth] Failed to send password reset email:', emailError);
    
    // In development mode, log OTP
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  [DEV MODE] Password Reset OTP: ${otp}`);
      return {
        success: true,
        message: `[DEV MODE] Reset OTP: ${otp}`,
        expiresAt,
      };
    }
    
    // In production, still return success (don't reveal if account exists)
    return {
      success: true,
      message: 'If an account exists, a password reset code has been sent.',
      expiresAt,
    };
  }

  return {
    success: true,
    message: 'If an account exists, a password reset code has been sent.',
    expiresAt,
  };
}

// ==========================================
// VERIFY RESET OTP
// ==========================================

/**
 * Verify password reset OTP
 */
export async function verifyResetOTP(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError('INVALID_REQUEST', 'Email is required', 400);
  }

  // Find user
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Check if OTP exists and not expired
  if (!user.otp || !user.otp_expires_at) {
    throw new AppError(
      'OTP_NOT_FOUND',
      'No reset code found. Please request a new one.',
      400
    );
  }

  if (new Date(user.otp_expires_at) < new Date()) {
    throw new AppError(
      'OTP_EXPIRED',
      'Reset code has expired. Please request a new one.',
      400
    );
  }

  // Check attempts
  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(
      'TOO_MANY_ATTEMPTS',
      'Too many failed attempts. Please request a new code.',
      429
    );
  }

  // Verify OTP
  if (user.otp !== otp) {
    await incrementOTPAttempts(user.id);
    const remainingAttempts = MAX_OTP_ATTEMPTS - (user.otp_attempts + 1);

    throw new AppError(
      'INVALID_OTP',
      `Invalid reset code. ${remainingAttempts} attempts remaining.`,
      400
    );
  }

  // Generate a temporary token (valid for 30 minutes to complete password reset)
  const resetToken = signLocalJwt(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    } as any,
    'access' // Use shorter expiry
  );

  return {
    success: true,
    message: 'Code verified successfully',
    resetToken,
  };
}

// ==========================================
// RESET PASSWORD
// ==========================================

/**
 * Reset password with verified token
 */
export async function resetPassword(resetToken: string, newPassword: string) {
  // Verify reset token
  let payload;
  try {
    payload = verifyLocalJwt(resetToken);
  } catch (err) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired reset token', 400);
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await updateUserPassword(payload.userId, passwordHash);

  // Audit log
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (user) {
    await createAuditLog(user.tenant_id, user.id, 'PASSWORD_RESET', 'USER', user.id);
  }

  return {
    success: true,
    message: 'Password reset successfully. You can now login with your new password.',
  };
}
