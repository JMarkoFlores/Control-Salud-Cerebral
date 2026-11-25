import { Router } from 'express';
import { RecordatorioController } from '../controllers/recordatorio.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new RecordatorioController();

router.use(authenticateJWT);

router.get('/', controller.getRecordatorios);
router.post('/', requireRole(['TITULAR', 'ADMIN']), controller.crearRecordatorio);
router.patch('/:id/estado', requireRole(['TITULAR', 'ADMIN']), controller.toggleEstado);
router.delete('/:id', requireRole(['TITULAR', 'ADMIN']), controller.eliminar);

export default router;
