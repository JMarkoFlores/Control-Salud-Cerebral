import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { createRepository } from './repositories';
import { DashboardService } from './services/dashboard.service';
import { createApiRouter } from './routes';
import { DashboardRepository } from './types';

const repository = createRepository();
const service = new DashboardService(repository, env.CACHE_TTL_MS);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? false : env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '64kb' }));

app.use('/api', createApiRouter(repository, service));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Error inesperado';
  console.error('[api] Error:', message);
  res.status(500).json({ error: 'No fue posible completar la solicitud.' });
});

const server = app.listen(env.PORT, () => {
  console.log(
    `[api] Dashboard BI escuchando en el puerto ${env.PORT} · fuente=${env.DATA_SOURCE} · zona=${env.TZ}`
  );
});

function shutdown(signal: string): void {
  console.log(`[api] Recibido ${signal}; cerrando servidor.`);
  server.close(() => {
    const closeRepository = (repository as DashboardRepository & { close?: () => Promise<void> }).close;
    Promise.resolve(closeRepository?.call(repository))
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
