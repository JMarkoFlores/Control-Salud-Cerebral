import { Request, Response, NextFunction } from 'express';
import { EvaluacionService } from '../services/evaluacion.service';
import { RecordatorioRepository } from '../repositories/recordatorio.repository';
import { AlertaRepository } from '../repositories/alerta.repository';
import { LogroRepository } from '../repositories/logro.repository';

export class DashboardController {
  private evalService = new EvaluacionService();
  private recordatorioRepo = new RecordatorioRepository();
  private alertaRepo = new AlertaRepository();
  private logroRepo = new LogroRepository();

  getTitularDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const cuentaId = req.user!.cuenta_id;

      const [evaluacion, recordatorios, totalAlertasPendientes, logros] = await Promise.all([
        this.evalService.recalcularSaludCerebral(personaId),
        this.recordatorioRepo.getRecordatorios(personaId),
        this.alertaRepo.getConteoPendientes(cuentaId),
        this.logroRepo.getLogrosPorPersona(personaId),
      ]);

      const ultimosLogros = logros.filter(l => l.desbloqueado === 1).slice(0, 3);
      const proximosRecordatorios = recordatorios.filter(r => r.estado === 'ACTIVO').slice(0, 3);

      res.json({
        success: true,
        data: {
          puntajeSaludCerebral: evaluacion.puntajeTotal,
          categoriaRiesgo: evaluacion.categoriaRiesgo,
          categoriaDetalle: evaluacion.categoriaDetalle,
          desglosePilares: {
            actividadFisica: evaluacion.puntajeActividad,
            contactoSocial: evaluacion.puntajeSocial,
            cardiometabolico: evaluacion.puntajeCardiometabolico,
          },
          kpis: {
            caf: evaluacion.caf,
            ccs: evaluacion.ccs,
            fcm: evaluacion.fcm,
          },
          totalAlertasPendientes,
          proximosRecordatorios,
          ultimosLogros,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getAcompananteDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Para acompañante, persona_titular_id es el titular
      const titularPersonaId = req.user!.persona_titular_id;
      const cuentaId = req.user!.cuenta_id;

      const [evaluacion, alertas] = await Promise.all([
        this.evalService.recalcularSaludCerebral(titularPersonaId),
        this.alertaRepo.getAlertasPorCuenta(cuentaId),
      ]);

      res.json({
        success: true,
        data: {
          modo: 'SOLO_LECTURA',
          titular: {
            nombres: req.user!.nombres,
            apellidos: req.user!.apellidos,
            codigo_interno: req.user!.codigo_interno,
          },
          puntajeSaludCerebral: evaluacion.puntajeTotal,
          categoriaRiesgo: evaluacion.categoriaRiesgo,
          categoriaDetalle: evaluacion.categoriaDetalle,
          desglosePilares: {
            actividadFisica: evaluacion.puntajeActividad,
            contactoSocial: evaluacion.puntajeSocial,
            cardiometabolico: evaluacion.puntajeCardiometabolico,
          },
          kpis: {
            caf: evaluacion.caf,
            ccs: evaluacion.ccs,
            fcm: evaluacion.fcm,
          },
          alertasTitular: alertas.slice(0, 5),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
