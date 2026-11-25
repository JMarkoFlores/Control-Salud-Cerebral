import { Router } from 'express';
import { LogroController } from '../controllers/logro.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();
const controller = new LogroController();

router.use(authenticateJWT);

router.get('/mis-logros', controller.getMisLogros);

export default router;
