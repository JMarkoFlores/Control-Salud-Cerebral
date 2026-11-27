import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  console.error('[Unhandled Error]', {
    path: req.path,
    method: req.method,
    statusCode,
    error: err.message || err,
    stack: err.stack,
  });

  // No exponer mensajes ni trazas internas en errores 5xx.
  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    success: false,
    error: {
      code: isServerError ? 'INTERNAL_SERVER_ERROR' : err.code || 'REQUEST_ERROR',
      message: isServerError
        ? 'Ocurrió un error inesperado en el servidor.'
        : err.message || 'Solicitud inválida.',
      details: !isServerError && process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
