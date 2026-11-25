import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: Array<'TITULAR' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión para realizar esta acción.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Acceso restringido: Tu rol actual (${req.user.rol}) no tiene permisos para este recurso.`,
        },
      });
      return;
    }

    next();
  };
}
