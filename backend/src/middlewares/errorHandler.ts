import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('[Backend Error]:', err.message || err);
  res.status(500).json({
    error: 'An internal server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
