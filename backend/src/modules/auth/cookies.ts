import type { Response } from 'express';
import { env } from '../../env';

export const ACCESS_TOKEN_COOKIE = 'rbs_access';
export const REFRESH_TOKEN_COOKIE = 'rbs_refresh';
export const RESTAURANT_ID_COOKIE = 'rbs_restaurant';
export const TENANT_ID_COOKIE = 'rbs_tenant';
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

const isProd = env.NODE_ENV === 'production';
const sameSite = isProd ? 'none' : 'lax';

// Centralized cookie management for auth tokens and context (restaurant/tenant IDs) with httpOnly for tokens and accessible cookies for frontend context
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite,
} as const;

const ACCESS_COOKIE_OPTIONS = {
  ...baseCookieOptions,
  path: '/',
} as const;

const REFRESH_COOKIE_OPTIONS = {
  ...baseCookieOptions,
  path: REFRESH_COOKIE_PATH,
} as const;

// Restaurant and Tenant ID cookies - not httpOnly so frontend can read them
const CONTEXT_COOKIE_OPTIONS = {
  httpOnly: false, // Allow JavaScript access for these
  secure: isProd,
  sameSite,
  path: '/',
} as const;

const DEFAULT_REFRESH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const DEFAULT_CONTEXT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function setAuthCookies(
  res: Response,
  params: { 
    accessToken: string; 
    refreshToken?: string; 
    expiresAt?: number | null;
    restaurantId?: string | null;
    tenantId?: string | null;
  }
) {
  const accessMaxAgeMs =
    typeof params.expiresAt === 'number'
      ? Math.max(params.expiresAt * 1000 - Date.now(), 0) // in ms
      : undefined;

  if (accessMaxAgeMs && accessMaxAgeMs > 0) {
    res.cookie(ACCESS_TOKEN_COOKIE, params.accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: accessMaxAgeMs,
    });
  } else {
    res.cookie(ACCESS_TOKEN_COOKIE, params.accessToken, ACCESS_COOKIE_OPTIONS);
  }

  if (params.refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, params.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: DEFAULT_REFRESH_MAX_AGE_MS,
    });
  }

  // Set restaurant ID cookie if provided
  if (params.restaurantId) {
    res.cookie(RESTAURANT_ID_COOKIE, params.restaurantId, {
      ...CONTEXT_COOKIE_OPTIONS,
      maxAge: DEFAULT_CONTEXT_MAX_AGE_MS,
    });
  }

  // Set tenant ID cookie if provided
  if (params.tenantId) {
    res.cookie(TENANT_ID_COOKIE, params.tenantId, {
      ...CONTEXT_COOKIE_OPTIONS,
      maxAge: DEFAULT_CONTEXT_MAX_AGE_MS,
    });
  }
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_COOKIE_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS);
  res.clearCookie(RESTAURANT_ID_COOKIE, CONTEXT_COOKIE_OPTIONS);
  res.clearCookie(TENANT_ID_COOKIE, CONTEXT_COOKIE_OPTIONS);
}
