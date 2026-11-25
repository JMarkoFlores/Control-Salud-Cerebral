import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/registro', controller.registro);
router.get('/me', authenticateJWT, controller.me);

// Gestión de acompañantes autorizados por el titular
router.get('/acompanantes', authenticateJWT, requireRole(['TITULAR']), controller.getAcompanantes);
router.post('/acompanantes', authenticateJWT, requireRole(['TITULAR']), controller.crearAcompanante);
router.patch('/acompanantes/:cuentaId/autorizado', authenticateJWT, requireRole(['TITULAR']), controller.toggleAcompanante);

export default router;
