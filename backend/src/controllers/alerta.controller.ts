import { Request, Response, NextFunction } from 'express';
import { AlertaRepository } from '../repositories/alerta.repository';
import { AlertaService } from '../services/alerta.service';

export class AlertaController {
  private alertaRepo = new AlertaRepository();
  private alertaService = new AlertaService();

  getMisAlertas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cuentaId = req.user!.cuenta_id;
      const estado = req.query.estado as ('PENDIENTE' | 'ATENDIDA' | 'CERRADA') | undefined;

      const alertas = await this.alertaRepo.getAlertasPorCuenta(cuentaId, estado);
      res.json({ success: true, data: alertas });
    } catch (error) {
      next(error);
    }
  };

  getConteoPendientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cuentaId = req.user!.cuenta_id;
      const total = await this.alertaRepo.getConteoPendientes(cuentaId);
      res.json({ success: true, data: { totalPendientes: total } });
    } catch (error) {
      next(error);
    }
  };

  marcarAtendida = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cuentaId = req.user!.cuenta_id;
      const alertaId = parseInt(req.params.id, 10);

      const ok = await this.alertaRepo.marcarAtendida(alertaId, cuentaId);
      if (!ok) {
        res.status(404).json({ success: false, error: { message: 'Alerta no encontrada o ya atendida.' } });
        return;
      }

      res.json({ success: true, data: { message: 'Alerta marcada como atendida.' } });
    } catch (error) {
      next(error);
    }
  };

  ejecutarMotor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await this.alertaService.ejecutarMotorAlertas();
      res.json({
        success: true,
        data: { message: 'Motor de reglas ejecutado exitosamente.', ...resultado },
      });
    } catch (error) {
      next(error);
    }
  };
}
