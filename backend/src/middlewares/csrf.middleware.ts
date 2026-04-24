import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../env';
import { AppError } from './error.middleware';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  SUPER_ADMIN_ACCESS_TOKEN_COOKIE,
  SUPER_ADMIN_CSRF_TOKEN_COOKIE,
} from '../modules/auth/cookies';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_AUTH_CSRF_EXEMPT_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/staff/login',
  '/api/v1/auth/waiter/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-register-otp',
  '/api/v1/auth/resend-register-otp',
  '/api/v1/auth/resend-otp',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/verify-forgot-password-otp',
  '/api/v1/auth/reset-password',
  '/api/v1/super-admin/auth/login',
  '/api/v1/super-admin/auth/2fa/verify-login',
]);

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getRequestPath(req: Request) {
  return (req.baseUrl || req.path || req.originalUrl || '').replace(/\/+$/, '');
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  if (PUBLIC_AUTH_CSRF_EXEMPT_PATHS.has(getRequestPath(req))) {
    return next();
  }

  const usingMainAuthCookie = Boolean(req.cookies?.[ACCESS_TOKEN_COOKIE]);
  const usingSuperAdminCookie = Boolean(req.cookies?.[SUPER_ADMIN_ACCESS_TOKEN_COOKIE]);

  if (!usingMainAuthCookie && !usingSuperAdminCookie) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin) {
    return next(new AppError('FORBIDDEN', 'Missing request origin', 403));
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const allowedOrigins = new Set(env.CORS_ALLOWED_ORIGINS.map(normalizeOrigin));
  if (!allowedOrigins.has(normalizedOrigin)) {
    return next(new AppError('FORBIDDEN', 'Invalid request origin', 403));
  }

  const csrfCookieName = usingSuperAdminCookie ? SUPER_ADMIN_CSRF_TOKEN_COOKIE : CSRF_TOKEN_COOKIE;
  const csrfCookie = req.cookies?.[csrfCookieName];
  const csrfHeader = req.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || !safeEqual(csrfCookie, csrfHeader)) {
    return next(new AppError('FORBIDDEN', 'Invalid CSRF token', 403));
  }

  return next();
}
