import type { Request, Response, NextFunction } from 'express';

const BLOCKED_UA_PATTERNS = [/^$/, /sqlmap/i, /nikto/i];

function shouldInspect(request: Request) {
  return (
    request.path.startsWith('/api/v1/auth') ||
    request.path.startsWith('/api/v1/public') ||
    request.path.startsWith('/api/v1/customers/public')
  );
}

export function botProtection(req: Request, res: Response, next: NextFunction) {
  if (!shouldInspect(req) || req.path.startsWith('/api/v1/integrations/')) {
    return next();
  }

  const userAgent = req.get('user-agent') ?? '';
  if (BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return res.status(400).json({
      error: { code: 'BOT_DETECTED', message: 'Request blocked' },
    });
  }
  return next();
}
