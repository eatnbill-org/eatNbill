import type { ZodSchema, ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join(', ');
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Check if body exists and is an object
    if (req.body === undefined || req.body === null) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          'Request body is required. Ensure Content-Type is application/json',
          400
        )
      );
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          formatZodError(result.error),
          400
        )
      );
    }

    req.body = result.data as unknown;
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          formatZodError(result.error),
          400
        )
      );
    }

    req.query = result.data as unknown as typeof req.query;
    return next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          formatZodError(result.error),
          400
        )
      );
    }

    req.params = result.data as unknown as typeof req.params;
    return next();
  };
}
