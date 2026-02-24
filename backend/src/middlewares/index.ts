import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { helmetMiddleware } from '../security/helmet';
import { botProtection } from '../security/botProtection';
import { jsonLimit, urlencodedLimit } from '../security/requestLimits';
import { requestTimeout } from '../security/requestTimeout';
import { timingMiddleware } from './timing.middleware';
import { env } from '../env';
import { redisClient } from '../utils/redis';

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: env.REDIS_URL && redisClient.getClient()
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.getClient()!.call(...(args as [string, ...string[]])) as Promise<any>,
      })
    : undefined,
});

const defaultLimiter = (req: any, res: any, next: any) => next(); // No-op for better performance


export function applyCommonMiddleware(app: Express) {
  const allowedOrigins = new Set(env.CORS_ALLOWED_ORIGINS.map((origin) => origin.replace(/\/+$/, '')));

  // CORS configuration - must be before other middleware
  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser and same-origin requests (no Origin header)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id'],
  }));

  // Logging middleware (development only)
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
  
  // Performance timing middleware (development only)
  if (env.NODE_ENV === 'development') {
    app.use(timingMiddleware);
  }
  
  app.use(helmetMiddleware);
  app.use(cookieParser());
  app.use(hpp());
  app.use(jsonLimit);
  app.use(urlencodedLimit);
  app.use(requestTimeout);
  app.use(botProtection);
}

export const rateLimiters = {
  auth: authLimiter,
  default: defaultLimiter,
};

// Authentication middleware
export { authMiddleware } from './auth.middleware';

// Admin middleware
export { 
  adminAuthMiddleware, 
  adminIPAllowlist, 
  adminRateLimiter,
  logAdminAction 
} from './admin.middleware';
