import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log slow requests (>1s)
 * Helps identify performance bottlenecks
 */
export function timingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log warnings for slow requests
    if (duration > 1000) {
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms (status: ${res.statusCode})`);
    }
    
    // Log all requests in development
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.log(`⏱️  ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}
