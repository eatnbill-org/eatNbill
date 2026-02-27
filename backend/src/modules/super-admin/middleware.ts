import type { Request, Response, NextFunction } from 'express';
import { verifyLocalJwt } from '../../utils/jwt';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../../utils/redis';

/**
 * Super Admin authentication middleware
 * - Verifies local JWT from cookies or Authorization header
 * - Checks AdminUser table (NEVER trusts JWT claims alone)
 * - Sets req.adminUser context
 */
export async function superAdminAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    // Try to get token from cookies first, then Authorization header
    const cookieToken = req.cookies?.sa_access_token;
    const header = req.get('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = cookieToken || bearer;

    if (!token) {
      return next(new AppError('UNAUTHORIZED', 'Missing authentication token', 401));
    }

    const payload = verifyLocalJwt(token);
    
    // Ensure it's an access token
    if (payload.type !== 'access') {
      return next(new AppError('UNAUTHORIZED', 'Invalid token type', 401));
    }

    // CRITICAL: Always verify against AdminUser table - never trust JWT claims alone
    const adminUser = await prisma.adminUser.findFirst({
      where: { 
        id: payload.userId,
        is_active: true,
        deleted_at: null 
      },
      select: { id: true, email: true, name: true },
    });

    if (!adminUser) {
      return next(new AppError('FORBIDDEN', 'Not authorized as super admin', 403));
    }

    req.adminUser = {
      adminId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
    };

    return next();
  } catch (_error) {
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401));
  }
}

/**
 * Strict rate limiter for super admin routes (30 requests per minute)
 * Falls back to memory store if Redis is not connected
 */
export const superAdminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many admin requests' } },
  store: redisClient.isReady()
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(...args) as Promise<any>,
        prefix: 'rl:superadmin:',
      })
    : undefined, // Falls back to memory store
});

/**
 * Log super admin action to PlatformAuditLog
 */
export async function logSuperAdminAction(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  tenantId?: string,
  metadata?: Record<string, unknown>,
  req?: Request
) {
  return prisma.platformAuditLog.create({
    data: {
      admin_id: adminId,
      action,
      entity,
      entity_id: entityId,
      tenant_id: tenantId,
      metadata: metadata as any,
      ip_address: req?.ip || req?.socket.remoteAddress,
      user_agent: req?.get('user-agent'),
    },
  });
}
