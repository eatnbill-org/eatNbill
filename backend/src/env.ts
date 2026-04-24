import { z } from 'zod';

const parseCsv = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const parseBooleanish = (value: unknown, defaultValue: boolean) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const envSchema = z.object({
  // Supabase (required)
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(), // Optional: Direct connection for Prisma migrations

  // JWT Configuration
  JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  JWT_ISSUER: z.string().min(1),

  // Local JWT Configuration (for our own tokens)
  JWT_SECRET: z.string().min(32).default(() => {
    if (process.env.NODE_ENV === 'development') {
      return require('crypto').randomBytes(32).toString('hex');
    }
    throw new Error('JWT_SECRET is required in production');
  }),
  JWT_ACCESS_EXPIRY: z.string().default('1d'), // Access token expiry
  JWT_REFRESH_EXPIRY: z.string().default('30d'), // Refresh token expiry
  JWT_PASSWORD_RESET_EXPIRY: z.string().default('15m'), // Password reset token expiry

  // Redis
  REDIS_URL: z.string().optional(),

  // Server Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY: z.string().default('2'),
  FRONTEND_URL: z.string().default('https://eatnbill.com').transform((val) => val.trim().replace(/\/+$/, '')),
  FRONTEND_URLS: z.string().optional().transform((val) => parseCsv(val)),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: z.preprocess((value) => parseBooleanish(value, process.env.NODE_ENV === 'production'), z.boolean()),
  AUTH_CSRF_COOKIE_NAME: z.string().default('rbs_csrf'),
  SUPER_ADMIN_CSRF_COOKIE_NAME: z.string().default('sa_csrf'),
  WEBHOOK_STRICT_SIGNATURE: z.preprocess((value) => parseBooleanish(value, process.env.NODE_ENV === 'production'), z.boolean()),
  ENABLE_DEBUG_ROUTES: z.preprocess((value) => parseBooleanish(value, process.env.NODE_ENV !== 'production'), z.boolean()),

  // Admin configuration (optional)
  ADMIN_ALLOWED_IPS: z.string().optional().transform((val) =>
    val ? val.split(',').map(ip => ip.trim()) : []
  ),

  // Integration encryption (required for Zomato/Swiggy webhooks)
  // Generate with: openssl rand -hex 32
  INTEGRATION_SECRET_MASTER_KEY: z.string().length(64).optional(),

  // Resend email provider
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_APPI_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().default('no-reply@resend.dev'),
  RESEND_FROM_NAME: z.string().default('RBS Notifications'),
}).refine((data) => Boolean(data.RESEND_API_KEY || data.RESEND_APPI_KEY), {
  message: 'RESEND_API_KEY (or RESEND_APPI_KEY) is required',
  path: ['RESEND_API_KEY'],
});

const parsedEnv = envSchema.parse(process.env);

function parseTrustProxy(value: string): boolean | number | string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) return asNumber;
  return value;
}

export const env = {
  ...parsedEnv,
  TRUST_PROXY_VALUE: parseTrustProxy(parsedEnv.TRUST_PROXY),
  CORS_ALLOWED_ORIGINS: Array.from(
    new Set([
      parsedEnv.FRONTEND_URL,
      ...parsedEnv.FRONTEND_URLS,
    ])
  ),
};
