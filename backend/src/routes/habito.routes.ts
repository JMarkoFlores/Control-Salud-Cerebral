import { Router } from 'express';
import { HabitoController } from '../controllers/habito.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new HabitoController();

router.use(authenticateJWT);

// Metas
router.get('/metas', controller.getMetas);
router.post('/metas', requireRole(['ADMIN']), controller.guardarMeta);

// Sesiones físicas
router.get('/fisica', controller.getSesionesFisicas);
router.post('/fisica', requireRole(['TITULAR', 'ADMIN']), controller.crearSesionFisica);
router.patch('/fisica/:id/anular', requireRole(['TITULAR', 'ADMIN']), controller.anularSesionFisica);

// Contacto social
router.get('/social', controller.getContactosSociales);
router.post('/social', requireRole(['TITULAR', 'ADMIN']), controller.crearContactoSocial);
router.patch('/social/:id/anular', requireRole(['TITULAR', 'ADMIN']), controller.anularContactoSocial);

// Confirmación diaria
router.get('/confirmacion/semana', controller.getPanelConfirmacionSemana);
router.post('/confirmacion', requireRole(['TITULAR', 'ADMIN']), controller.confirmarDia);

export default router;
