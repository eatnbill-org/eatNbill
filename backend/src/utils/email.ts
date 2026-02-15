import { env } from '../env';
import { logger } from './logger';

const RESEND_API_URL = 'https://api.resend.com/emails';

type ResendResponse = {
  id?: string;
  message?: string;
};

function getResendApiKey(): string {
  return env.RESEND_API_KEY || env.RESEND_APPI_KEY || '';
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY/RESEND_APPI_KEY is not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        text: text || stripHtmlTags(html),
      }),
    });

    const payload = (await response.json()) as ResendResponse;
    if (!response.ok) {
      return {
        success: false,
        error: payload.message || `Resend API failed with status ${response.status}`,
      };
    }

    return { success: true, messageId: payload.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendEmailAsync(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  setImmediate(async () => {
    const result = await sendViaResend(to, subject, html, text);
    if (result.success) {
      logger.info(`[Email] Sent to ${to}: ${result.messageId || 'ok'}`);
    } else {
      logger.error(`[Email] Failed to send to ${to}:`, { error: result.error });
    }
  });
}

export async function sendEmailSync(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const result = await sendViaResend(to, subject, html, text);

  if (result.success) {
    logger.info(`[Email] Sent to ${to}: ${result.messageId || 'ok'}`);
    return result;
  }

  logger.error(`[Email] Failed to send to ${to}:`, { error: result.error });
  if (env.NODE_ENV === 'development') {
    logger.warn(`[Email][DEV] Subject: ${subject}`);
    logger.warn(`[Email][DEV] Body preview: ${(text || stripHtmlTags(html)).slice(0, 200)}...`);
  }

  return result;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function testEmailConnection(): Promise<boolean> {
  const result = await sendViaResend(
    env.RESEND_FROM_EMAIL,
    'RBS email connection test',
    '<p>Connection test</p>',
    'Connection test'
  );
  return result.success;
}
