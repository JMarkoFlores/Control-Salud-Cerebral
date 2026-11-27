import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import apiRoutes from './routes';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { startAlertCronJobs } from './jobs/alertCron.job';

const app = express();

// Detrás de Traefik en producción: usa la IP real del cliente para logs y rate limit.
// En local no se confía en cabeceras reenviadas (evita spoofing de X-Forwarded-For).
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.disable('x-powered-by');

// Cabeceras de seguridad (API JSON; la CSP se aplica en nginx para el frontend).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// CORS cerrado por defecto: solo mismo origen, salvo orígenes explicitos en CORS_ORIGINS.
app.use(cors({
  origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging de peticiones (sin cuerpos ni cabeceras sensibles)
app.use((req, res, next) => {
  if (env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${req.method} ${req.path}`);
  }
  next();
});

// Enrutador de la API v1
app.use('/api', apiLimiter);
app.use('/api/v1', apiRoutes);

// Ruta base: solo lo minimo, sin pistas de infraestructura
app.get('/', (req, res) => {
  res.json({ status: 'ONLINE' });
});

// Manejo centralizado de errores
app.use(errorHandler);

// Iniciar servidor y tareas cron
const server = app.listen(env.PORT, () => {
  console.log('=============================================================');
  console.log(`🚀 SERVIDOR BACKEND ACTIVO EN PUERTO: ${env.PORT}`);
  console.log(`📍 Endpoint API: http://localhost:${env.PORT}/api/v1`);
  console.log(`🕒 Zona horaria configurada: ${env.TZ}`);
  console.log('=============================================================');

  // Iniciar Cron motor de alertas
  startAlertCronJobs();
});

export default app;
