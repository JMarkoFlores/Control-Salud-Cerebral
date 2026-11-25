import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import habitoRoutes from './habito.routes';
import controlRoutes from './control.routes';
import simuladorRoutes from './simulador.routes';
import recordatorioRoutes from './recordatorio.routes';
import alertaRoutes from './alerta.routes';
import logroRoutes from './logro.routes';
import adminRoutes from './admin.routes';
import chatbotRoutes from './chatbot.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/habitos', habitoRoutes);
router.use('/controles', controlRoutes);
router.use('/simulador', simuladorRoutes);
router.use('/recordatorios', recordatorioRoutes);
router.use('/alertas', alertaRoutes);
router.use('/logros', logroRoutes);
router.use('/admin', adminRoutes);
router.use('/chatbot', chatbotRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'prevencion-cognitiva-api',
    version: '1.0.0',
    timeZone: 'America/Lima',
  });
});

export default router;
