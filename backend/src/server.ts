import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { startAlertCronJobs } from './jobs/alertCron.job';

const app = express();

// Middlewares globales
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de peticiones
app.use((req, res, next) => {
  if (env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${req.method} ${req.url}`);
  }
  next();
});

// Enrutador de la API v1
app.use('/api/v1', apiRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({
    nombre: 'API Prevención del Deterioro Cognitivo mediante Hábitos Diarios (G1)',
    version: '1.0.0',
    piloto: 'Trujillo, Perú',
    documentacion: '/api/v1/health',
    status: 'ONLINE',
  });
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
