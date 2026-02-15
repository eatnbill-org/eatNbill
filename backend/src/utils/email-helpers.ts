import { sendEmailAsync, sendEmailSync } from './email';
import {
  confirmSignupTemplate,
  forgotPasswordTemplate,
  invitationTemplate,
} from './email-templates';
import { env } from '../env';

/**
 * Send signup confirmation email with OTP
 * @param email - Recipient email address
 * @param userName - User's name
 * @param otp - One-time password
 * @param expiryMinutes - OTP expiry time in minutes (default: 15)
 */
export async function sendSignupConfirmationEmail(
  email: string,
  userName: string,
  otp: string,
  expiryMinutes: number = 15
): Promise<void> {
  const subject = 'Confirm Your Email - eatNbill Registration';
  const html = confirmSignupTemplate(otp, userName, expiryMinutes);
  
  // Use sync sending for signup to ensure email is sent before returning
  const result = await sendEmailSync(email, subject, html);
  
  if (!result.success) {
    throw new Error(`Failed to send confirmation email: ${result.error}`);
  }
}

/**
 * Send password reset email with OTP
 * @param email - Recipient email address
 * @param userName - User's name
 * @param otp - One-time password for reset
 * @param expiryMinutes - OTP expiry time in minutes (default: 15)
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  otp: string,
  expiryMinutes: number = 15
): Promise<void> {
  const subject = 'Reset Your Password - eatNbill';
  const html = forgotPasswordTemplate(otp, userName, expiryMinutes);
  
  // Use sync sending for password reset to ensure email is sent
  const result = await sendEmailSync(email, subject, html);
  
  if (!result.success) {
    throw new Error(`Failed to send password reset email: ${result.error}`);
  }
}

/**
 * Send invitation email to join restaurant
 * @param email - Invitee's email address
 * @param inviterName - Name of the person sending invitation
 * @param inviteeName - Name of the person being invited
 * @param restaurantName - Name of the restaurant
 * @param role - Role being assigned
 * @param invitationToken - Unique token for the invitation link
 * @param expiryDays - Number of days until invitation expires (default: 7)
 */
export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  inviteeName: string,
  restaurantName: string,
  role: 'OWNER' | 'MANAGER' | 'WAITER',
  invitationToken: string,
  expiryDays: number = 7
): Promise<void> {
  const frontendUrl = Array.isArray(env.FRONTEND_URL) ? env.FRONTEND_URL[0] : env.FRONTEND_URL;
  const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;
  
  const subject = `You're invited to join ${restaurantName} on RBS`;
  const html = invitationTemplate(
    inviterName,
    inviteeName,
    restaurantName,
    role,
    invitationLink,
    expiryDays
  );
  
  await sendEmailAsync(email, subject, html);
}

/**
 * Send invitation email synchronously (use when you need to confirm delivery)
 */
export async function sendInvitationEmailSync(
  email: string,
  inviterName: string,
  inviteeName: string,
  restaurantName: string,
  role: 'OWNER' | 'MANAGER' | 'WAITER',
  invitationToken: string,
  expiryDays: number = 7
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const frontendUrl = Array.isArray(env.FRONTEND_URL) ? env.FRONTEND_URL[0] : env.FRONTEND_URL;
  const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;
  
  const subject = `You're invited to join ${restaurantName} on RBS`;
  const html = invitationTemplate(
    inviterName,
    inviteeName,
    restaurantName,
    role,
    invitationLink,
    expiryDays
  );
  
  return await sendEmailSync(email, subject, html);
}

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate OTP with expiry timestamp
 * @param expiryMinutes - Number of minutes until OTP expires
 * @returns Object with OTP and expiry timestamp
 */
export function generateOTPWithExpiry(expiryMinutes: number = 15): { otp: string; expiresAt: Date } {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return { otp, expiresAt };
}
