import { Request, Response, NextFunction } from 'express';
import { ControlRepository } from '../repositories/control.repository';
import { EvaluacionService } from '../services/evaluacion.service';
import { getFirstDayOfMonth, formatDateDMY, formatDateYMD } from '../utils/dateUtils';

export class ControlController {
  private controlRepo = new ControlRepository();
  private evalService = new EvaluacionService();

  getControlesMes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const mes = (req.query.mes as string) || getFirstDayOfMonth();

      const controles = await this.controlRepo.getControlesProgramadosMes(personaId, mes);
      res.json({ success: true, data: { mesPeriodo: mes, controles } });
    } catch (error) {
      next(error);
    }
  };

  crearControlProgramado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const {
        tipo_control,
        mes_periodo,
        fecha_prevista,
        criterio_meta_texto,
        valor_meta_min,
        valor_meta_max,
        valor_meta_max_diast,
        unidad,
      } = req.body;

      if (!tipo_control || !mes_periodo || !fecha_prevista || !criterio_meta_texto || !unidad) {
        res.status(400).json({ success: false, error: { message: 'Faltan campos obligatorios para agendar el control.' } });
        return;
      }

      const controlId = await this.controlRepo.createControlProgramado({
        persona_id: personaId,
        tipo_control,
        mes_periodo,
        fecha_prevista,
        criterio_meta_texto,
        valor_meta_min: valor_meta_min ? parseFloat(valor_meta_min) : undefined,
        valor_meta_max: valor_meta_max ? parseFloat(valor_meta_max) : undefined,
        valor_meta_max_diast: valor_meta_max_diast ? parseFloat(valor_meta_max_diast) : undefined,
        unidad,
      });

      await this.evalService.recalcularSaludCerebral(personaId);

      res.status(201).json({
        success: true,
        data: { message: 'Control cardiometabólico programado con éxito.', controlId },
      });
    } catch (error) {
      next(error);
    }
  };

  getHistorialResultados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const historial = await this.controlRepo.getHistorialResultados(personaId);
      res.json({ success: true, data: historial });
    } catch (error) {
      next(error);
    }
  };

  crearResultado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const {
        control_id,
        tipo_control,
        fecha_medicion,
        valor_numerico,
        valor_sistolica,
        valor_diastolica,
        unidad,
        origen,
        es_referencia,
      } = req.body;

      if (!tipo_control || !fecha_medicion || !unidad) {
        res.status(400).json({ success: false, error: { message: 'Tipo de control, fecha y unidad son obligatorios.' } });
        return;
      }

      // Validación para presión arterial
      if (tipo_control === 'Presión arterial') {
        if (valor_sistolica === undefined || valor_diastolica === undefined || valor_sistolica === null || valor_diastolica === null) {
          res.status(400).json({
            success: false,
            error: { message: 'La presión arterial exige el par de valores: sistólica y diastólica.' },
          });
          return;
        }
      } else {
        if (valor_numerico === undefined || valor_numerico === null) {
          res.status(400).json({
            success: false,
            error: { message: `Para ${tipo_control} se requiere ingresar el valor numérico medido.` },
          });
          return;
        }
      }

      // Evaluar dentro_de_meta si está vinculado a un control programado
      let finalControlId: number | null = control_id ? parseInt(control_id, 10) : null;
      let dentro_de_meta: boolean | null = null;

      // Auto-vinculación inteligente: si no se especificó un control_id manual,
      // buscar si el usuario tiene una meta activa en su agenda para este factor en el mes de la toma
      const pool = await (await import('../config/database')).getPool();
      if (!finalControlId && req.body.es_libre !== true) {
        const fechaBaseStr = typeof fecha_medicion === 'string' ? fecha_medicion.slice(0, 10) : formatDateYMD(fecha_medicion);
        const mesPeriodo = getFirstDayOfMonth(new Date(fechaBaseStr + 'T00:00:00'));
        const autoCtrl = await pool.request()
          .input('pid', (await import('../config/database')).sql.Int, personaId)
          .input('tc', (await import('../config/database')).sql.VarChar(30), tipo_control)
          .input('mes', (await import('../config/database')).sql.Date, mesPeriodo)
          .query(`
            SELECT TOP 1 control_id
            FROM control_programado
            WHERE persona_id = @pid AND tipo_control = @tc AND mes_periodo = @mes AND vigente = 1
          `);
        if (autoCtrl.recordset.length > 0) {
          finalControlId = autoCtrl.recordset[0].control_id;
        }
      }

      if (finalControlId) {
        const ctrlRes = await pool.request()
          .input('cid', (await import('../config/database')).sql.Int, finalControlId)
          .query(`SELECT valor_meta_min, valor_meta_max, valor_meta_max_diast, criterio_meta_texto FROM control_programado WHERE control_id = @cid`);

        if (ctrlRes.recordset.length > 0) {
          const ctrl = ctrlRes.recordset[0];
          if (tipo_control === 'Presión arterial') {
            const sis = parseFloat(valor_sistolica);
            const dia = parseFloat(valor_diastolica);
            const maxSis = ctrl.valor_meta_max ? parseFloat(ctrl.valor_meta_max) : 120;
            const maxDia = ctrl.valor_meta_max_diast ? parseFloat(ctrl.valor_meta_max_diast) : 80;
            dentro_de_meta = sis <= maxSis && dia <= maxDia;
          } else {
            const val = parseFloat(valor_numerico);
            const min = ctrl.valor_meta_min !== null ? parseFloat(ctrl.valor_meta_min) : -Infinity;
            const max = ctrl.valor_meta_max !== null ? parseFloat(ctrl.valor_meta_max) : Infinity;
            dentro_de_meta = val >= min && val <= max;
          }
        }
      }

      const resultadoId = await this.controlRepo.insertResultadoControl({
        control_id: finalControlId,
        persona_id: personaId,
        tipo_control,
        fecha_medicion,
        valor_numerico: valor_numerico ? parseFloat(valor_numerico) : null,
        valor_sistolica: valor_sistolica ? parseFloat(valor_sistolica) : null,
        valor_diastolica: valor_diastolica ? parseFloat(valor_diastolica) : null,
        unidad,
        origen: origen || 'Autorreporte',
        es_referencia: es_referencia !== undefined ? Boolean(es_referencia) : true,
        dentro_de_meta,
      });

      // Recalcular FCM y salud cerebral
      await this.evalService.recalcularSaludCerebral(personaId);

      res.status(201).json({
        success: true,
        data: { message: 'Resultado clínico registrado exitosamente.', resultadoId, dentro_de_meta },
      });
    } catch (error) {
      next(error);
    }
  };

  getResumenConsultaMedica = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const historial = await this.controlRepo.getHistorialResultados(personaId, 20);

      const resumen = historial.map(r => ({
        tipo: r.tipo_control,
        fecha: formatDateDMY(r.fecha_medicion),
        valorTexto: r.tipo_control === 'Presión arterial' ? `${r.valor_sistolica}/${r.valor_diastolica} ${r.unidad}` : `${r.valor_numerico} ${r.unidad}`,
        enMeta: r.dentro_de_meta === 1 ? 'Sí (En meta)' : (r.dentro_de_meta === 0 ? 'No (Fuera de meta)' : 'Libre sin meta'),
        criterioMeta: r.criterio_meta_texto || 'Medición libre',
        origen: r.origen,
      }));

      res.json({
        success: true,
        data: {
          paciente: {
            nombres: req.user!.nombres,
            apellidos: req.user!.apellidos,
            codigo_interno: req.user!.codigo_interno,
          },
          fechaEmision: formatDateDMY(new Date()),
          totalMediciones: resumen.length,
          mediciones: resumen,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
