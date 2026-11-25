import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new AdminController();

router.use(authenticateJWT);
router.use(requireRole(['ADMIN']));

router.get('/stats', controller.getStats);
router.get('/usuarios', controller.getUsuarios);
router.get('/reportes/actividad', controller.getReporteActividad);
router.get('/reportes/social', controller.getReporteSocial);
router.get('/reportes/cardio', controller.getReporteCardio);

// Reglas de alerta
router.get('/reglas', controller.getReglas);
router.patch('/reglas/:id/toggle', controller.toggleRegla);
router.get('/ejecuciones', controller.getEjecuciones);

// Catálogos
router.get('/ubicaciones', controller.getUbicaciones);
router.get('/catalogos/logros', controller.getCatalogoLogros);
router.patch('/catalogos/logros/:id/toggle', controller.toggleCatalogoLogro);

export default router;
