import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthPayload {
  sub: string;
  role: 'admin';
}

export function signToken(username: string): string {
  const payload: AuthPayload = { sub: username, role: 'admin' };
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'dashboard-bi'
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'dashboard-bi' });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Token inválido');
  }
  return { sub: String(decoded.sub), role: 'admin' };
}
