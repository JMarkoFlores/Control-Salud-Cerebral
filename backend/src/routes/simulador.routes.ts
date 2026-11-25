import { Router } from 'express';
import { SimuladorController } from '../controllers/simulador.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();
const controller = new SimuladorController();

router.use(authenticateJWT);

router.post('/calcular', controller.calcular);
router.post('/guardar', controller.guardar);
router.get('/historial', controller.getHistorial);

export default router;
