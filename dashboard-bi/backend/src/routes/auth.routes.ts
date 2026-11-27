import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { signToken } from '../auth/tokens';
import {
  clearAttempts,
  isRateLimited,
  registerFailedAttempt,
  retryAfterSeconds
} from '../auth/rateLimit';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200)
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const key = req.ip ?? 'unknown';

  if (isRateLimited(key)) {
    res.status(429).json({
      error: 'Demasiados intentos. Intente nuevamente más tarde.',
      retryAfter: retryAfterSeconds(key)
    });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    return;
  }

  const { username, password } = parsed.data;
  const usernameMatches = username === env.ADMIN_USER;
  const passwordMatches = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);

  if (!usernameMatches || !passwordMatches) {
    registerFailedAttempt(key);
    res.status(401).json({ error: 'Credenciales inválidas.' });
    return;
  }

  clearAttempts(key);
  const token = signToken(username);
  res.json({
    token,
    user: { username, role: 'admin' },
    expiresIn: env.JWT_EXPIRES_IN
  });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: { username: req.auth?.sub ?? env.ADMIN_USER, role: 'admin' } });
});
