import { Router } from 'express';
import { ControlController } from '../controllers/control.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new ControlController();

router.use(authenticateJWT);

router.get('/mes', controller.getControlesMes);
router.post('/programar', requireRole(['TITULAR', 'ADMIN']), controller.crearControlProgramado);
router.get('/historial', controller.getHistorialResultados);
router.post('/resultado', requireRole(['TITULAR', 'ADMIN']), controller.crearResultado);
router.get('/resumen-consulta', controller.getResumenConsultaMedica);

export default router;
