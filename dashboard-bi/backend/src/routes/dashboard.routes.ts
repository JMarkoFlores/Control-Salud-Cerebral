import { Router } from 'express';
import { DashboardRepository } from '../types';
import { DashboardService } from '../services/dashboard.service';
import { filtersFromQuery, isViewId, VIEW_IDS } from '../utils/filters';

export function createDashboardRouter(
  repository: DashboardRepository,
  service: DashboardService
): Router {
  const router = Router();

  router.get('/meta', async (_req, res, next) => {
    try {
      const meta = await service.getMeta();
      res.json(meta);
    } catch (error) {
      next(error);
    }
  });

  router.get('/filters', async (req, res, next) => {
    try {
      const meta = await repository.getMeta();
      const view = isViewId(req.query.view) ? req.query.view : 'resumen';
      const filters = filtersFromQuery(req.query as Record<string, unknown>, meta, view);
      const options = await repository.getFilterOptions(filters);
      res.json(options);
    } catch (error) {
      next(error);
    }
  });

  router.get('/views', (_req, res) => {
    res.json({ views: VIEW_IDS });
  });

  router.get('/views/:view', async (req, res, next) => {
    try {
      if (!isViewId(req.params.view)) {
        res.status(404).json({ error: 'Vista no encontrada.' });
        return;
      }
      const meta = await repository.getMeta();
      const filters = filtersFromQuery(
        req.query as Record<string, unknown>,
        meta,
        req.params.view
      );
      const response = await service.getView(req.params.view, filters);
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
