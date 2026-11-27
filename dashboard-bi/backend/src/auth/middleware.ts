import { NextFunction, Request, Response } from 'express';
import { AuthPayload, verifyToken } from './tokens';

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}
