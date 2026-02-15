import type { Request, Response, NextFunction } from 'express';
import { verifyLocalJwt } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { AppError } from './error.middleware';
import { env } from '../env';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../utils/redis';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/cookies';

/**
 * Admin authentication middleware
 * - Verifies local JWT
 * - Checks AdminUser table (NEVER trusts JWT claims alone)
 * - Sets req.adminUser context
 */
export async function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.get('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
    const token = bearer || cookieToken;

    if (!token) {
      return next(new AppError('UNAUTHORIZED', 'Missing bearer token', 401));
    }

    const payload = verifyLocalJwt(token);
    
    // Ensure it's an access token
    if (payload.type !== 'access') {
      return next(new AppError('UNAUTHORIZED', 'Invalid token type', 401));
    }

    const supabaseId = payload.supabaseId;
    const userId = payload.userId;

    if (!supabaseId && !userId) {
      return next(new AppError('UNAUTHORIZED', 'Invalid token', 401));
    }

    // CRITICAL: Always verify against AdminUser table - never trust JWT claims alone
    // Try to find by supabaseId first, then by userId
    const adminUser = await prisma.adminUser.findFirst({
      where: { 
        OR: [
          { supabase_id: supabaseId || '' },
          { id: userId },
        ],
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
    return next(new AppError('UNAUTHORIZED', 'Invalid token', 401));
  }
}

/**
 * IP allowlist middleware for admin routes (optional)
 * Enable by setting ADMIN_ALLOWED_IPS env var
 */
export function adminIPAllowlist(req: Request, _res: Response, next: NextFunction) {
  const allowedIPs = env.ADMIN_ALLOWED_IPS;
  
  if (!allowedIPs || allowedIPs.length === 0) {
    // No IP restriction configured
    return next();
  }

  const clientIP = req.ip || req.socket.remoteAddress || '';
  
  if (!allowedIPs.includes(clientIP)) {
    return next(new AppError('FORBIDDEN', 'Access denied from this IP', 403));
  }

  return next();
}

/**
 * Strict rate limiter for admin routes (30 requests per minute)
 * Falls back to memory store if Redis is not connected
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many admin requests' } },
  store: redisClient.isReady()
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(...args) as Promise<any>,
        prefix: 'rl:admin:',
      })
    : undefined, // Falls back to memory store
});

/**
 * Log admin action to PlatformAuditLog
 */
export async function logAdminAction(
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
