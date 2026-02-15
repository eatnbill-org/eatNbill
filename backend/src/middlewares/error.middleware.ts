import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Log the actual error for debugging
  console.error('Unhandled error:', err);
  console.error('Stack trace:', err.stack);

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' },
  });
}
