import type { Request, Response, NextFunction } from 'express';
import { verifyLocalJwt, signLocalJwt } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { AppError } from './error.middleware';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setAuthCookies } from '../modules/auth/cookies';

const AUTH_CACHE_TTL = 600; // 10 minutes
const AUTH_CACHE_PREFIX = 'auth:ctx:';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.get('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
    const token = bearer || cookieToken;

    if (!token) {
      return next(new AppError('UNAUTHORIZED', 'Missing bearer token', 401));
    }

    // Handle authentication with local JWT (used by both admin and staff)
    return handleAuth(token, req, res, next);
  } catch (_error) {
    return next(new AppError('UNAUTHORIZED', 'Invalid token', 401));
  }
}

/**
 * Handle authentication with local JWT (used by both admin and staff)
 * Automatically refreshes tokens if access token is expired but refresh token is valid
 */
async function handleAuth(token: string, req: Request, res: Response, next: NextFunction) {
  try {
    // Try to verify access token
    const payload = verifyLocalJwt(token);

    // Ensure it's an access token (not refresh)
    if (payload.type !== 'access') {
      return next(new AppError('UNAUTHORIZED', 'Invalid token type', 401));
    }

    const userId = payload.userId;

    if (!userId) {
      return next(new AppError('UNAUTHORIZED', 'Invalid token', 401));
    }

    // Try Redis cache first
    const cacheKey = `${AUTH_CACHE_PREFIX}${userId}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);

    if (cached) {
      try {
        const userContext = JSON.parse(cached);
        req.user = userContext;
        return next();
      } catch (e) {
        // Cache parse error, fall through to DB
      }
    }

    // Cache miss - fetch from DB
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null, is_active: true },
      select: {
        id: true,
        tenant_id: true,
        role: true,
        tenant: { select: { plan: true } }
      },
    });

    if (!user) {
      return next(new AppError('UNAUTHORIZED', 'User not found', 401));
    }

    let allowedRestaurantIds: string[] = [];
    let restaurantRoles: Record<string, string> = {};

    if (user.role === 'OWNER') {
      const restaurants = await prisma.restaurant.findMany({
        where: { tenant_id: user.tenant_id, deleted_at: null },
        select: { id: true },
      });
      allowedRestaurantIds = restaurants.map((r) => r.id);
      // OWNERs keep OWNER role on all restaurants
      restaurantRoles = Object.fromEntries(
        allowedRestaurantIds.map(id => [id, 'OWNER'])
      );
    } else {
      const assignments = await prisma.restaurantUser.findMany({
        where: { user_id: user.id, is_active: true },
        select: { restaurant_id: true, role: true },
      });
      allowedRestaurantIds = assignments.map((a) => a.restaurant_id);
      restaurantRoles = Object.fromEntries(
        assignments.map(a => [a.restaurant_id, a.role])
      );
    }

    const userContext = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      tenantPlan: user.tenant.plan,
      allowedRestaurantIds,
      restaurantRoles,
      isWaiter: false,
    };

    // Cache for 10 minutes
    await redisClient.set(cacheKey, JSON.stringify(userContext), AUTH_CACHE_TTL).catch(() => { });

    req.user = userContext;

    return next();
  } catch (error: any) {
    // Check if error is due to token expiration
    if (error.message === 'Token expired') {
      // Try to refresh using refresh token
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        return next(new AppError('UNAUTHORIZED', 'Token expired and no refresh token available', 401));
      }

      try {
        // Verify refresh token
        const refreshPayload = verifyLocalJwt(refreshToken);

        // Ensure it's a refresh token
        if (refreshPayload.type !== 'refresh') {
          return next(new AppError('UNAUTHORIZED', 'Invalid refresh token type', 401));
        }

        const userId = refreshPayload.userId;

        if (!userId) {
          return next(new AppError('UNAUTHORIZED', 'Invalid refresh token', 401));
        }

        // Fetch fresh user data from DB
        const user = await prisma.user.findFirst({
          where: { id: userId, deleted_at: null, is_active: true },
          select: {
            id: true,
            tenant_id: true,
            role: true,
            supabase_id: true,
            tenant: { select: { plan: true } }
          },
        });

        if (!user) {
          return next(new AppError('UNAUTHORIZED', 'User not found or inactive', 401));
        }

        // Get updated restaurant assignments
        let allowedRestaurantIds: string[] = [];
        let restaurantRoles: Record<string, string> = {};

        if (user.role === 'OWNER') {
          const restaurants = await prisma.restaurant.findMany({
            where: { tenant_id: user.tenant_id, deleted_at: null },
            select: { id: true },
          });
          allowedRestaurantIds = restaurants.map((r) => r.id);
          restaurantRoles = Object.fromEntries(
            allowedRestaurantIds.map(id => [id, 'OWNER'])
          );
        } else {
          const assignments = await prisma.restaurantUser.findMany({
            where: { user_id: user.id, is_active: true },
            select: { restaurant_id: true, role: true },
          });
          allowedRestaurantIds = assignments.map((a) => a.restaurant_id);
          restaurantRoles = Object.fromEntries(
            assignments.map(a => [a.restaurant_id, a.role])
          );
        }

        // Generate new access and refresh tokens
        const newAccessToken = signLocalJwt(
          {
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role,
            supabaseId: user.supabase_id || undefined,
          },
          'access'
        );

        const newRefreshToken = signLocalJwt(
          {
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role,
            supabaseId: user.supabase_id || undefined,
          },
          'refresh'
        );

        const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes

        // Set new cookies
        setAuthCookies(res, {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt,
          restaurantId: allowedRestaurantIds[0] || null,
          tenantId: user.tenant_id,
        });

        // Set user context and continue
        const userContext = {
          userId: user.id,
          tenantId: user.tenant_id,
          role: user.role,
          tenantPlan: user.tenant.plan,
          allowedRestaurantIds,
          restaurantRoles,
          isWaiter: false,
        };

        // Update cache
        const cacheKey = `${AUTH_CACHE_PREFIX}${userId}`;
        await redisClient.set(cacheKey, JSON.stringify(userContext), AUTH_CACHE_TTL).catch(() => { });

        req.user = userContext;

        console.log('[Auth Middleware] Access token expired - refreshed automatically');
        return next();
      } catch (refreshError: any) {
        // Refresh token is also invalid or expired
        return next(new AppError('UNAUTHORIZED', 'Session expired. Please log in again.', 401));
      }
    }

    // Other token verification errors
    return next(new AppError('UNAUTHORIZED', 'Invalid token', 401));
  }
}

/**
 * ✅ Helper to invalidate user cache (call after user/role updates)
 */
export async function invalidateUserCache(supabaseId: string) {
  await redisClient.hdel(`${AUTH_CACHE_PREFIX}${supabaseId}`).catch(() => { });
}
