import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const staffLoginSchema = z
  .object({
    email: z.string().min(1, 'Email or ID is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

// Backward-compatible alias
export const waiterLoginSchema = staffLoginSchema;

export const registerWithOTPSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format').nullable().optional(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(8).optional(),
    restaurantName: z.string().min(1, 'Restaurant name is required'),
    tenantId: z.string().uuid().optional(),
  })
  .strict();

export const verifyOTPSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  })
  .strict();

export const resendOTPSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    type: z.enum(['signup', 'reset']).default('signup'),
  })
  .strict();

export const loginWithPasswordSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email('Invalid email format'),
  })
  .strict();

export const verifyResetOTPSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  })
  .strict();

export const resetPasswordWithTokenSchema = z
  .object({
    resetToken: z.string().min(1, 'Reset token is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  })
  .strict();
