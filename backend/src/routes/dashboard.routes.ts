import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new DashboardController();

router.get('/titular', authenticateJWT, requireRole(['TITULAR', 'ADMIN']), controller.getTitularDashboard);
router.get('/acompanante', authenticateJWT, requireRole(['ACOMPANANTE', 'ADMIN']), controller.getAcompananteDashboard);

export default router;
