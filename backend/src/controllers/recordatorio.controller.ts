import { Request, Response, NextFunction } from 'express';
import { RecordatorioRepository } from '../repositories/recordatorio.repository';

export class RecordatorioController {
  private recordatorioRepo = new RecordatorioRepository();

  getRecordatorios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const list = await this.recordatorioRepo.getRecordatorios(personaId);
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  crearRecordatorio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { tipo_aviso, hora_programada, dias_semana, destino_tipo, destino_registro_id } = req.body;

      if (!tipo_aviso || !hora_programada || !destino_tipo) {
        res.status(400).json({ success: false, error: { message: 'Tipo de aviso, hora y destino son requeridos.' } });
        return;
      }

      const id = await this.recordatorioRepo.createRecordatorio({
        persona_id: personaId,
        tipo_aviso,
        hora_programada,
        dias_semana: dias_semana || 'L,M,X,J,V,S,D',
        destino_tipo,
        destino_registro_id,
      });

      res.status(201).json({ success: true, data: { message: 'Recordatorio programado con éxito.', id } });
    } catch (error) {
      next(error);
    }
  };

  toggleEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const id = parseInt(req.params.id, 10);
      const { estado } = req.body; // 'ACTIVO' | 'PAUSADO'

      const ok = await this.recordatorioRepo.toggleEstado(id, personaId, estado);
      if (!ok) {
        res.status(404).json({ success: false, error: { message: 'Recordatorio no encontrado.' } });
        return;
      }

      res.json({ success: true, data: { message: `Recordatorio ${estado === 'ACTIVO' ? 'activado' : 'pausado'} correctamente.` } });
    } catch (error) {
      next(error);
    }
  };

  eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const id = parseInt(req.params.id, 10);

      const ok = await this.recordatorioRepo.deleteRecordatorio(id, personaId);
      if (!ok) {
        res.status(404).json({ success: false, error: { message: 'Recordatorio no encontrado.' } });
        return;
      }

      res.json({ success: true, data: { message: 'Recordatorio eliminado correctamente.' } });
    } catch (error) {
      next(error);
    }
  };
}
