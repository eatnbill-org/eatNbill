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

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
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
