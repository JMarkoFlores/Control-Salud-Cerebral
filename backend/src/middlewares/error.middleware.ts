import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Unhandled Error]', {
    path: req.path,
    method: req.method,
    error: err.message || err,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Ocurrió un error inesperado en el servidor.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
