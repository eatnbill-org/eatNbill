import type { Request, Response, NextFunction } from 'express';

const TIMEOUT_MS = 15_000;

export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  req.setTimeout(TIMEOUT_MS);
  res.setTimeout(TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: { code: 'TIMEOUT', message: 'Request timed out' } });
    }
  });
  next();
}
