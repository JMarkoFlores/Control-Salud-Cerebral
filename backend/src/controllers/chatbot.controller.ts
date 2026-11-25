import { Request, Response, NextFunction } from 'express';
import { ChatbotService } from '../services/chatbot.service';

export class ChatbotController {
  private chatbotService = new ChatbotService();

  preguntar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const titularNombre = req.user!.nombres;
      const { mensaje } = req.body;

      if (!mensaje || typeof mensaje !== 'string') {
        res.status(400).json({ success: false, error: { message: 'Debes enviar un mensaje de consulta.' } });
        return;
      }

      const respuesta = await this.chatbotService.responderConsulta(personaId, titularNombre, mensaje);
      res.json({ success: true, data: respuesta });
    } catch (error) {
      next(error);
    }
  };
}
