import { z } from 'zod';

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

  // Redis
  REDIS_URL: z.string().optional(),

  // Server Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().default('http://localhost:8080').transform((val) => {
    // Support comma-separated URLs for multiple frontend origins
    return val.includes(',') ? val.split(',').map(url => url.trim()) : val;
  }),

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

export const env = envSchema.parse(process.env);
