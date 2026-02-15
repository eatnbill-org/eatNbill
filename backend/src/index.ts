import express from 'express';
import { env } from './env';
import { shutdownPrisma, prisma } from './utils/prisma';
import { connectRedis, shutdownRedis, redisClient } from './utils/redis';
import { applyCommonMiddleware } from './middlewares';
import { errorHandler } from './middlewares/error.middleware';
import { registerRoutes } from './routes';

async function bootstrap() {
  try {
    console.log('🚀 Starting RBS Backend...\n');

    // Initialize connections
    await initializeConnections();

    // Create Express app
    const app = express();
    app.set('trust proxy', 2);

    // Apply middleware
    applyCommonMiddleware(app);

    // Health check endpoint
    let lastDbCheck = 0;
    let lastDbStatus: 'up' | 'down' = 'down';

    app.get('/api/v1/health', async (_req, res) => {
      const now = Date.now();

      if (now - lastDbCheck > 5000) {
        try {
          await prisma.$queryRaw`SELECT 1`;
          lastDbStatus = 'up';
        } catch {
          lastDbStatus = 'down';
        }
        lastDbCheck = now;
      }

      const checks = {
        supabase_db: lastDbStatus,
        redis: redisClient.isReady() ? 'up' : 'down',
      };

      const healthy = checks.supabase_db === 'up';

      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        checks,
      });
    });


    // Register all routes
    registerRoutes(app);

    // Error handler (must be last)
    app.use(errorHandler);

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${env.PORT}`);
      console.log(`✓ Environment: ${env.NODE_ENV}\n`);
    });

    // Graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

async function initializeConnections() {
  // Connect to Redis
  await connectRedis();
  if (redisClient.isReady()) {
    console.log('✓ Redis connected');
  }

  // Check Supabase Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Supabase Database connected');
  } catch (error) {
    console.error('✗ Supabase Database connection failed');
    console.error('  Make sure your DATABASE_URL is correct in .env');
  }
}

function setupGracefulShutdown(server: any) {
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop accepting new connections
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('✓ HTTP server closed');
        resolve();
      });
    });

    // Close connections
    await shutdownPrisma();
    await shutdownRedis();

    console.log('✓ All connections closed');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start the application
bootstrap();
