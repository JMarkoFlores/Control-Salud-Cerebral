import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { DataMartController } from '../controllers/datamart.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new AdminController();
const datamartController = new DataMartController();

router.use(authenticateJWT);
router.use(requireRole(['ADMIN']));

router.get('/stats', controller.getStats);
router.get('/usuarios', controller.getUsuarios);
router.get('/titulares', controller.getTitulares);
router.get('/titulares/:personaId/metas', controller.getMetasTitular);
router.put('/titulares/:personaId/metas', controller.actualizarMetasTitular);
router.post('/usuarios', controller.crearUsuario);
router.put('/usuarios/:id', controller.actualizarUsuario);
router.patch('/usuarios/:id/toggle-activo', controller.toggleActivoUsuario);
router.delete('/usuarios/:id', controller.eliminarUsuario);
router.get('/reportes/actividad', controller.getReporteActividad);
router.get('/reportes/social', controller.getReporteSocial);
router.get('/reportes/cardio', controller.getReporteCardio);

// Refresco manual del Data Mart dimensional (ETL 03 + 04)
router.post('/datamart/refresh', datamartController.refresh);

// Reglas de alerta
router.get('/reglas', controller.getReglas);
router.patch('/reglas/:id/toggle', controller.toggleRegla);
router.get('/ejecuciones', controller.getEjecuciones);

// Catálogos
router.get('/ubicaciones', controller.getUbicaciones);
router.get('/catalogos/logros', controller.getCatalogoLogros);
router.patch('/catalogos/logros/:id/toggle', controller.toggleCatalogoLogro);

export default router;
