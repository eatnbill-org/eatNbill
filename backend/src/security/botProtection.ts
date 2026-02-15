import type { Request, Response, NextFunction } from 'express';

const BLOCKED_UA_PATTERNS = [/^$/, /curl\//i, /wget\//i];

export function botProtection(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('user-agent') ?? '';
  if (BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return res.status(400).json({
      error: { code: 'BOT_DETECTED', message: 'Request blocked' },
    });
  }
  return next();
}
