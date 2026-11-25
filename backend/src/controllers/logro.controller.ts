import { Request, Response, NextFunction } from 'express';
import { LogroRepository } from '../repositories/logro.repository';

export class LogroController {
  private logroRepo = new LogroRepository();

  getMisLogros = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const logros = await this.logroRepo.getLogrosPorPersona(personaId);

      const totalDesbloqueados = logros.filter(l => l.desbloqueado === 1).length;
      res.json({
        success: true,
        data: {
          totalDesbloqueados,
          totalCatalogo: logros.length,
          porcentajeColeccion: Math.round((totalDesbloqueados / (logros.length || 1)) * 100),
          logros,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
