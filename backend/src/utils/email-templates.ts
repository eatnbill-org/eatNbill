/**
 * Email template for signup confirmation with OTP
 */
export function confirmSignupTemplate(otp: string, userName: string, expiryMinutes: number = 15): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .otp-box {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #667eea;
      font-family: 'Courier New', monospace;
    }
    .expiry-note {
      font-size: 14px;
      color: #666666;
      margin-top: 10px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666666;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to RBS!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Thank you for signing up! To complete your registration and verify your email address, please use the One-Time Password (OTP) below:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">This code expires in ${expiryMinutes} minutes</div>
      </div>

      <p>Enter this code in the verification page to activate your account and start using our restaurant billing system.</p>

      <div class="warning">
        <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Our team will never ask for your OTP.
      </div>

      <p>If you didn't create an account with us, please ignore this email.</p>
      
      <p>Best regards,<br>The RBS Team</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Restaurant Billing System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for password reset with OTP
 */
export function forgotPasswordTemplate(otp: string, userName: string, expiryMinutes: number = 15): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .otp-box {
      background-color: #f8f9fa;
      border: 2px dashed #f5576c;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #f5576c;
      font-family: 'Courier New', monospace;
    }
    .expiry-note {
      font-size: 14px;
      color: #666666;
      margin-top: 10px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666666;
    }
    .warning {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password. Use the One-Time Password (OTP) below to proceed with resetting your password:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">This code expires in ${expiryMinutes} minutes</div>
      </div>

      <p>Enter this code on the password reset page to create a new password for your account.</p>

      <div class="warning">
        <strong>⚠️ Security Alert:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure. Never share this OTP with anyone.
      </div>

      <p>If you continue to have issues, please contact our support team.</p>
      
      <p>Best regards,<br>The RBS Team</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Restaurant Billing System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for user invitation
 */
export function invitationTemplate(
  inviterName: string,
  inviteeName: string,
  restaurantName: string,
  role: 'OWNER' | 'MANAGER' | 'WAITER',
  invitationLink: string,
  expiryDays: number = 7
): string {
  const roleDescriptions: Record<typeof role, string> = {
    OWNER: 'Owner - Full access to all restaurant features',
    MANAGER: 'Manager - Manage operations and staff',
    WAITER: 'Waiter - Process orders and handle customer billing',
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #e7f3ff;
      border-left: 4px solid #4facfe;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #0056b3;
      font-size: 14px;
      display: block;
      margin-bottom: 5px;
    }
    .info-box span {
      font-size: 18px;
      color: #333333;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      opacity: 0.9;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666666;
    }
    .expiry-note {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .link-fallback {
      font-size: 12px;
      color: #666666;
      word-break: break-all;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎊 You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hi ${inviteeName},</p>
      <p><strong>${inviterName}</strong> has invited you to join their team at:</p>
      
      <div class="info-box">
        <strong>🏪 RESTAURANT</strong>
        <span>${restaurantName}</span>
      </div>

      <div class="info-box">
        <strong>👤 YOUR ROLE</strong>
        <span>${roleDescriptions[role]}</span>
      </div>

      <p>You've been granted access to our Restaurant Billing System. Click the button below to accept the invitation and set up your account:</p>

      <div class="button-container">
        <a href="${invitationLink}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="expiry-note">
        <strong>⏳ Important:</strong> This invitation link will expire in ${expiryDays} days. Please accept it before then.
      </div>

      <p>Once you accept, you'll be able to:</p>
      <ul>
        <li>Access the restaurant dashboard</li>
        <li>Manage orders and billing</li>
        <li>Collaborate with your team</li>
        <li>Track sales and analytics</li>
      </ul>

      <p>If you have any questions or need assistance, feel free to reach out to ${inviterName} or our support team.</p>
      
      <p>Best regards,<br>The RBS Team</p>

      <div class="link-fallback">
        <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
        <p><small>${invitationLink}</small></p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Restaurant Billing System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
