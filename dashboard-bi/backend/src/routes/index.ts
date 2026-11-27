import { Router } from 'express';
import { env } from '../config/env';
import { requireAuth } from '../auth/middleware';
import { authRouter } from './auth.routes';
import { createDashboardRouter } from './dashboard.routes';
import { DashboardRepository } from '../types';
import { DashboardService } from '../services/dashboard.service';

export function createApiRouter(
  repository: DashboardRepository,
  service: DashboardService
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      service: 'dashboard-bi-api',
      source: env.DATA_SOURCE,
      timeZone: env.TZ
    });
  });

  router.use('/auth', authRouter);

  router.use(requireAuth);
  router.use(createDashboardRouter(repository, service));

  return router;
}
