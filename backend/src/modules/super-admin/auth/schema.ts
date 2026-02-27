import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyTotpLoginSchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required to confirm email change'),
});

export const setup2faSchema = z.object({});

export const enable2faSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
});

export const disable2faSchema = z.object({
  password: z.string().min(1, 'Password is required to disable 2FA'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyTotpLoginInput = z.infer<typeof verifyTotpLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type Enable2faInput = z.infer<typeof enable2faSchema>;
export type Disable2faInput = z.infer<typeof disable2faSchema>;
