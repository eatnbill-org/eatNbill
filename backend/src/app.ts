import express from 'express';
import { errorHandler } from './middlewares/error.middleware';
import { applyCommonMiddleware } from './middlewares';
import { authRoutes } from './modules/auth/routes';
import { productRoutes, publicProductRoutes } from './modules/products/routes';
import { orderRoutes, publicOrderRoutes } from './modules/orders/routes';
import integrationRoutes from './modules/integrations/routes';
import { prisma } from './utils/prisma';
import { redisClient } from './utils/redis';
import { env } from './env';

/**
 * Create and configures the Express application
 */
export async function createApp() {
  const app = express();

  app.set('trust proxy', 2);

  // Non-blocking startup diagnostics
  checkConnections().catch(console.error);

  // Apply common + security middleware
  applyCommonMiddleware(app);

  // Health endpoint
  app.get('/api/v1/health', healthCheckHandler);

  // Root
  app.get('/', (_req, res) => {
    res.send('Welcome to the API');
  });

  // Routes
  app.use('/api/v1/auth', authRoutes());
  app.use('/api/v1/products', productRoutes());
  app.use('/api/v1/orders', orderRoutes());
  app.use('/api/v1/public', publicProductRoutes());
  app.use('/api/v1/public', publicOrderRoutes());
  app.use('/api/v1/integrations', integrationRoutes);

  // Error handler (last)
  app.use(errorHandler);

  return app;
}

/**
 * Startup connection diagnostics (logging only)
 */
async function checkConnections() {
  // Redis
  if (redisClient.isReady()) {
    console.log('✓ Redis connected');
  } else {
    console.warn('⚠ Redis not ready');
  }

  // Supabase Database (via Prisma)
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Supabase Database connected');
  } catch {
    console.error('✗ Supabase Database connection failed');
  }

  // Supabase Auth (API health check)
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      console.log('✓ Supabase Auth/API connected');
    } else {
      console.warn(`⚠ Supabase Auth/API unhealthy: ${res.status}`);
    }
  } catch (err) {
    console.error('✗ Supabase Auth/API connection failed');
  }
}

/**
 * Health endpoint (Kubernetes / Docker / Load balancer safe)
 */
async function healthCheckHandler(
  _req: express.Request,
  res: express.Response
) {
  type CheckStatus = 'up' | 'down';

  const checks: {
    supabase_db: CheckStatus;
    supabase_auth: CheckStatus;
    redis: CheckStatus;
  } = {
    supabase_db: 'down',
    supabase_auth: 'down',
    redis: redisClient.isReady() ? 'up' : 'down',
  };

  const withTimeout = async <T>(promise: Promise<T>, ms: number) => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);
  };

  // Supabase Database check
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 2000);
    checks.supabase_db = 'up';
  } catch {
    checks.supabase_db = 'down';
  }

  // Redis check
  if (redisClient.isReady()) {
    try {
      await withTimeout(redisClient.ping(), 2000);
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
    }
  }

  // Supabase Auth/API check
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    checks.supabase_auth = response.ok ? 'up' : 'down';
  } catch {
    checks.supabase_auth = 'down';
  }

  // Service health policy: Both Supabase services must be up, Redis is optional
  const healthy =
    checks.supabase_db === 'up' &&
    checks.supabase_auth === 'up';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
