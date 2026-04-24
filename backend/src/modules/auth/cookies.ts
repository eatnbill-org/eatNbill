import crypto from 'crypto';
import type { CookieOptions, Response } from 'express';
import { env } from '../../env';

export const ACCESS_TOKEN_COOKIE = 'rbs_access';
export const REFRESH_TOKEN_COOKIE = 'rbs_refresh';
export const RESTAURANT_ID_COOKIE = 'rbs_restaurant';
export const TENANT_ID_COOKIE = 'rbs_tenant';
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';
export const CSRF_TOKEN_COOKIE = env.AUTH_CSRF_COOKIE_NAME;

export const SUPER_ADMIN_ACCESS_TOKEN_COOKIE = 'sa_access_token';
export const SUPER_ADMIN_REFRESH_TOKEN_COOKIE = 'sa_refresh_token';
export const SUPER_ADMIN_REFRESH_COOKIE_PATH = '/api/v1/super-admin/auth/refresh';
export const SUPER_ADMIN_CSRF_TOKEN_COOKIE = env.SUPER_ADMIN_CSRF_COOKIE_NAME;

const sameSite = env.AUTH_COOKIE_SAMESITE;
const secure = env.AUTH_COOKIE_SECURE;
const cookieDomain = env.AUTH_COOKIE_DOMAIN;

const DEFAULT_REFRESH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_CONTEXT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_SUPER_ADMIN_REFRESH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function buildCookieOptions(overrides: CookieOptions = {}): CookieOptions {
  return {
    secure,
    sameSite,
    domain: cookieDomain,
    ...overrides,
  };
}

function createHttpOnlyCookieOptions(path: string, maxAge?: number): CookieOptions {
  return buildCookieOptions({
    httpOnly: true,
    path,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  });
}

function createReadableCookieOptions(path = '/', maxAge?: number): CookieOptions {
  return buildCookieOptions({
    httpOnly: false,
    path,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  });
}

function clearCookie(res: Response, name: string, options: CookieOptions) {
  res.clearCookie(name, options);
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function getMainAccessCookieOptions(maxAge?: number) {
  return createHttpOnlyCookieOptions('/', maxAge);
}

export function getMainRefreshCookieOptions(maxAge?: number) {
  return createHttpOnlyCookieOptions(REFRESH_COOKIE_PATH, maxAge);
}

export function getMainContextCookieOptions(maxAge?: number) {
  return createReadableCookieOptions('/', maxAge);
}

export function getMainCsrfCookieOptions(maxAge?: number) {
  return createReadableCookieOptions('/', maxAge);
}

export function getSuperAdminAccessCookieOptions(maxAge?: number) {
  return createHttpOnlyCookieOptions('/', maxAge);
}

export function getSuperAdminRefreshCookieOptions(maxAge?: number) {
  return createHttpOnlyCookieOptions(SUPER_ADMIN_REFRESH_COOKIE_PATH, maxAge);
}

export function getSuperAdminCsrfCookieOptions(maxAge?: number) {
  return createReadableCookieOptions('/', maxAge);
}

export function setAuthCookies(
  res: Response,
  params: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number | null;
    restaurantId?: string | null;
    tenantId?: string | null;
    csrfToken?: string;
  }
) {
  const accessMaxAgeMs =
    typeof params.expiresAt === 'number'
      ? Math.max(params.expiresAt * 1000 - Date.now(), 0)
      : undefined;
  const csrfToken = params.csrfToken || generateCsrfToken();

  res.cookie(ACCESS_TOKEN_COOKIE, params.accessToken, getMainAccessCookieOptions(accessMaxAgeMs));

  if (params.refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, params.refreshToken, getMainRefreshCookieOptions(DEFAULT_REFRESH_MAX_AGE_MS));
  }

  res.cookie(CSRF_TOKEN_COOKIE, csrfToken, getMainCsrfCookieOptions(DEFAULT_REFRESH_MAX_AGE_MS));

  if (params.restaurantId) {
    res.cookie(RESTAURANT_ID_COOKIE, params.restaurantId, getMainContextCookieOptions(DEFAULT_CONTEXT_MAX_AGE_MS));
  }

  if (params.tenantId) {
    res.cookie(TENANT_ID_COOKIE, params.tenantId, getMainContextCookieOptions(DEFAULT_CONTEXT_MAX_AGE_MS));
  }
}

export function clearAuthCookies(res: Response) {
  clearCookie(res, ACCESS_TOKEN_COOKIE, getMainAccessCookieOptions());
  clearCookie(res, REFRESH_TOKEN_COOKIE, getMainRefreshCookieOptions());
  clearCookie(res, CSRF_TOKEN_COOKIE, getMainCsrfCookieOptions());
  clearCookie(res, RESTAURANT_ID_COOKIE, getMainContextCookieOptions());
  clearCookie(res, TENANT_ID_COOKIE, getMainContextCookieOptions());
}

export function setSuperAdminAuthCookies(
  res: Response,
  params: {
    accessToken: string;
    refreshToken?: string;
    accessMaxAgeMs?: number;
    refreshMaxAgeMs?: number;
    csrfToken?: string;
  }
) {
  const csrfToken = params.csrfToken || generateCsrfToken();
  res.cookie(
    SUPER_ADMIN_ACCESS_TOKEN_COOKIE,
    params.accessToken,
    getSuperAdminAccessCookieOptions(params.accessMaxAgeMs)
  );

  if (params.refreshToken) {
    res.cookie(
      SUPER_ADMIN_REFRESH_TOKEN_COOKIE,
      params.refreshToken,
      getSuperAdminRefreshCookieOptions(params.refreshMaxAgeMs ?? DEFAULT_SUPER_ADMIN_REFRESH_MAX_AGE_MS)
    );
  }

  res.cookie(
    SUPER_ADMIN_CSRF_TOKEN_COOKIE,
    csrfToken,
    getSuperAdminCsrfCookieOptions(params.refreshMaxAgeMs ?? DEFAULT_SUPER_ADMIN_REFRESH_MAX_AGE_MS)
  );
}

export function clearSuperAdminAuthCookies(res: Response) {
  clearCookie(res, SUPER_ADMIN_ACCESS_TOKEN_COOKIE, getSuperAdminAccessCookieOptions());
  clearCookie(res, SUPER_ADMIN_REFRESH_TOKEN_COOKIE, getSuperAdminRefreshCookieOptions());
  clearCookie(res, SUPER_ADMIN_CSRF_TOKEN_COOKIE, getSuperAdminCsrfCookieOptions());
}
