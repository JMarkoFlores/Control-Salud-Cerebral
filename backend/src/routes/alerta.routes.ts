import { Router } from 'express';
import { AlertaController } from '../controllers/alerta.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new AlertaController();

router.use(authenticateJWT);

router.get('/mis-alertas', controller.getMisAlertas);
router.get('/conteo-pendientes', controller.getConteoPendientes);
router.patch('/:id/atendida', controller.marcarAtendida);
router.post('/ejecutar-motor', requireRole(['ADMIN']), controller.ejecutarMotor);

export default router;
