import { Router } from 'express';
import { ChatbotController } from '../controllers/chatbot.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ChatbotController();

router.use(authenticateJWT);

router.post('/preguntar', controller.preguntar);

export default router;
