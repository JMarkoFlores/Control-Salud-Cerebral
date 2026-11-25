import { Request, Response, NextFunction } from 'express';
import { AdminRepository } from '../repositories/admin.repository';
import { AlertaRepository } from '../repositories/alerta.repository';
import { LogroRepository } from '../repositories/logro.repository';
import { getMondayOfCurrentWeek, getFirstDayOfMonth } from '../utils/dateUtils';

export class AdminController {
  private adminRepo = new AdminRepository();
  private alertaRepo = new AlertaRepository();
  private logroRepo = new LogroRepository();

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.adminRepo.getGlobalStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  getUsuarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rol, distrito, activo } = req.query;
      const usuarios = await this.adminRepo.getUsuarios({
        rol: rol as string,
        distrito: distrito as string,
        activo: activo !== undefined ? activo === 'true' : undefined,
      });
      res.json({ success: true, data: usuarios });
    } catch (error) {
      next(error);
    }
  };

  getReporteActividad = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const inicioSemana = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();
      const registros = await this.adminRepo.getReporteSemanalActividad(inicioSemana);

      // Calcular subtotales evaluables: excluir semanas con días pendientes o sin meta
      const filasProcesadas = registros.map(r => {
        const esEvaluable = r.dias_pendientes === 0;
        const porcentaje = esEvaluable && r.meta_minutos > 0
          ? Math.round((r.minutos_logrados / r.meta_minutos) * 1000) / 10
          : null;

        let estado = 'Datos pendientes';
        if (esEvaluable) {
          if (r.minutos_logrados === 0) estado = 'Sin actividad';
          else if (porcentaje !== null && porcentaje >= 80) estado = '¡Meta lograda!';
          else if (porcentaje !== null && porcentaje >= 50) estado = 'En progreso';
          else estado = 'Avance inicial';
        }

        return {
          ...r,
          esEvaluable,
          porcentaje,
          porcentajeTexto: porcentaje !== null ? `${porcentaje}%` : '—',
          estado,
        };
      });

      // Subtotales evaluables: sumar numeradores y denominadores del conjunto elegible
      const evaluables = filasProcesadas.filter(f => f.esEvaluable);
      const totalMinutosLogrados = evaluables.reduce((acc, f) => acc + f.minutos_logrados, 0);
      const totalMinutosMeta = evaluables.reduce((acc, f) => acc + f.meta_minutos, 0);
      const promedioGlobalEvaluable = totalMinutosMeta > 0
        ? Math.round((totalMinutosLogrados / totalMinutosMeta) * 1000) / 10
        : null;

      res.json({
        success: true,
        data: {
          inicioSemana,
          totalRegistros: filasProcesadas.length,
          totalEvaluables: evaluables.length,
          totalPendientes: filasProcesadas.length - evaluables.length,
          subtotalEvaluable: {
            minutosLogrados: totalMinutosLogrados,
            minutosMeta: totalMinutosMeta,
            promedioPct: promedioGlobalEvaluable,
            promedioTexto: promedioGlobalEvaluable !== null ? `${promedioGlobalEvaluable}%` : '—',
          },
          filas: filasProcesadas,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getReporteSocial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const inicioSemana = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();
      const registros = await this.adminRepo.getReporteSemanalSocial(inicioSemana);

      const filasProcesadas = registros.map(r => {
        const esEvaluable = r.dias_pendientes === 0;
        const porcentaje = esEvaluable && r.meta_dias > 0
          ? Math.round((r.dias_con_contacto / r.meta_dias) * 1000) / 10
          : null;

        let estado = 'Datos pendientes';
        if (esEvaluable) {
          if (r.dias_con_contacto === 0) estado = 'Sin contacto';
          else if (porcentaje !== null && porcentaje >= 80) estado = '¡Meta lograda!';
          else if (porcentaje !== null && porcentaje >= 50) estado = 'En progreso';
          else estado = 'Avance inicial';
        }

        return {
          ...r,
          esEvaluable,
          porcentaje,
          porcentajeTexto: porcentaje !== null ? `${porcentaje}%` : '—',
          estado,
        };
      });

      const evaluables = filasProcesadas.filter(f => f.esEvaluable);
      const totalDiasLogrados = evaluables.reduce((acc, f) => acc + f.dias_con_contacto, 0);
      const totalDiasMeta = evaluables.reduce((acc, f) => acc + f.meta_dias, 0);
      const promedioGlobalEvaluable = totalDiasMeta > 0
        ? Math.round((totalDiasLogrados / totalDiasMeta) * 1000) / 10
        : null;

      res.json({
        success: true,
        data: {
          inicioSemana,
          totalRegistros: filasProcesadas.length,
          totalEvaluables: evaluables.length,
          totalPendientes: filasProcesadas.length - evaluables.length,
          subtotalEvaluable: {
            diasLogrados: totalDiasLogrados,
            diasMeta: totalDiasMeta,
            promedioPct: promedioGlobalEvaluable,
            promedioTexto: promedioGlobalEvaluable !== null ? `${promedioGlobalEvaluable}%` : '—',
          },
          filas: filasProcesadas,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getReporteCardio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mesPeriodo = (req.query.mes as string) || getFirstDayOfMonth();
      const registros = await this.adminRepo.getReporteMensualCardiometabolico(mesPeriodo);

      const filasProcesadas = registros.map(r => {
        const esEvaluable = r.total_programados > 0 && r.controles_realizados > 0;
        const porcentaje = r.total_programados > 0
          ? Math.round((r.controles_en_meta / r.total_programados) * 1000) / 10
          : null;

        let estado = 'Pendiente de control';
        if (esEvaluable) {
          if (r.controles_en_meta === 0) estado = 'Ninguno en meta';
          else if (porcentaje !== null && porcentaje >= 75) estado = '¡Excelente control!';
          else if (porcentaje !== null && porcentaje >= 50) estado = 'En progreso';
          else estado = 'Avance inicial';
        }

        return {
          ...r,
          esEvaluable,
          porcentaje,
          porcentajeTexto: porcentaje !== null ? `${porcentaje}%` : '—',
          estado,
        };
      });

      const evaluables = filasProcesadas.filter(f => f.esEvaluable);
      const totalEnMeta = evaluables.reduce((acc, f) => acc + f.controles_en_meta, 0);
      const totalProgramados = evaluables.reduce((acc, f) => acc + f.total_programados, 0);
      const promedioGlobalEvaluable = totalProgramados > 0
        ? Math.round((totalEnMeta / totalProgramados) * 1000) / 10
        : null;

      res.json({
        success: true,
        data: {
          mesPeriodo,
          totalRegistros: filasProcesadas.length,
          totalEvaluables: evaluables.length,
          subtotalEvaluable: {
            controlesEnMeta: totalEnMeta,
            controlesProgramados: totalProgramados,
            promedioPct: promedioGlobalEvaluable,
            promedioTexto: promedioGlobalEvaluable !== null ? `${promedioGlobalEvaluable}%` : '—',
          },
          filas: filasProcesadas,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getReglas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reglas = await this.alertaRepo.getReglas();
      res.json({ success: true, data: reglas });
    } catch (error) {
      next(error);
    }
  };

  toggleRegla = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { activa } = req.body;
      const ok = await this.alertaRepo.toggleRegla(id, Boolean(activa));
      res.json({ success: true, data: { message: 'Estado de la regla actualizado correctamente.', ok } });
    } catch (error) {
      next(error);
    }
  };

  getEjecuciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const historial = await this.alertaRepo.getHistorialEjecuciones();
      res.json({ success: true, data: historial });
    } catch (error) {
      next(error);
    }
  };

  getUbicaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await this.adminRepo.getUbicaciones();
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  getCatalogoLogros = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await this.logroRepo.getCatalogo(false);
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  toggleCatalogoLogro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { activo } = req.body;
      const ok = await this.logroRepo.toggleCatalogoLogro(id, Boolean(activo));
      res.json({ success: true, data: { message: 'Estado de logro actualizado.', ok } });
    } catch (error) {
      next(error);
    }
  };
}
