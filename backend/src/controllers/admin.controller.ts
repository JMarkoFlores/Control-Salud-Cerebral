import { Request, Response, NextFunction } from 'express';
import { AdminRepository } from '../repositories/admin.repository';
import { AlertaRepository } from '../repositories/alerta.repository';
import { LogroRepository } from '../repositories/logro.repository';
import { ESTADOS_KPI, clasificarIndicador } from '../config/constants';
import { getMondayOfCurrentWeek, getFirstDayOfMonth } from '../utils/dateUtils';
import { isValidEmail, normalizeEmail, passwordPolicyError } from '../utils/password';

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
      const result = await this.adminRepo.getUsuarios({
        rol: rol as string,
        distrito: distrito as string,
        activo: activo !== undefined ? activo === 'true' : undefined,
      });
      res.json({
        success: true,
        data: result.usuarios,
        resumen: result.resumen,
      });
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
        const esEvaluable = r.dias_pendientes === 0 && r.meta_minutos > 0;
        const porcentajeCrudo = esEvaluable
          ? (r.minutos_logrados / r.meta_minutos) * 100
          : null;
        const porcentaje = porcentajeCrudo !== null
          ? Math.round(porcentajeCrudo * 10) / 10
          : null;
        const estado = porcentajeCrudo !== null
          ? ESTADOS_KPI[clasificarIndicador('CAF', porcentajeCrudo)].label
          : 'Datos pendientes';

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
        const esEvaluable = r.dias_pendientes === 0 && r.meta_dias > 0;
        const porcentajeCrudo = esEvaluable
          ? (r.dias_con_contacto / r.meta_dias) * 100
          : null;
        const porcentaje = porcentajeCrudo !== null
          ? Math.round(porcentajeCrudo * 10) / 10
          : null;
        const estado = porcentajeCrudo !== null
          ? ESTADOS_KPI[clasificarIndicador('CCS', porcentajeCrudo)].label
          : 'Datos pendientes';

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
        const esEvaluable = r.total_programados > 0 && r.controles_realizados === r.total_programados;
        const porcentajeCrudo = r.total_programados > 0
          ? (r.controles_en_meta / r.total_programados) * 100
          : null;
        const porcentaje = porcentajeCrudo !== null
          ? Math.round(porcentajeCrudo * 10) / 10
          : null;
        const estado = r.total_programados === 0
          ? ESTADOS_KPI.SIN_META.label
          : esEvaluable
            ? ESTADOS_KPI[clasificarIndicador('FCM', porcentajeCrudo)].label
            : ESTADOS_KPI.DATOS_PENDIENTES.label;

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

  getTitulares = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await this.adminRepo.getTitularesList();
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  crearUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        nombres,
        apellidos,
        fecha_nacimiento,
        sexo,
        ubicacion_id,
        correo_acceso,
        password,
        rol,
        persona_titular_id,
        nombre_contacto,
        parentesco,
        meta_actividad_minutos,
        meta_social_dias,
        meta_pa_sistolica,
        meta_pa_diastolica,
        meta_glucosa_min,
        meta_glucosa_max,
        meta_colesterol_max,
        meta_imc_min,
        meta_imc_max,
      } = req.body;

      if (!nombres || !apellidos || !fecha_nacimiento || !sexo || !ubicacion_id || !rol) {
        res.status(400).json({ success: false, error: { message: 'Faltan campos obligatorios para el registro.' } });
        return;
      }

      if (!['TITULAR', 'ADMIN'].includes(rol)) {
        res.status(400).json({ success: false, error: { message: 'El rol debe ser TITULAR o ADMIN.' } });
        return;
      }

      const correoNormalizado = normalizeEmail(correo_acceso);
      if (correoNormalizado && !isValidEmail(correoNormalizado)) {
        res.status(400).json({ success: false, error: { message: 'El correo electrónico no es válido.' } });
        return;
      }

      const passwordError = password ? passwordPolicyError(password) : null;
      if (passwordError) {
        res.status(400).json({ success: false, error: { message: passwordError } });
        return;
      }

      const result = await this.adminRepo.crearUsuario({
        nombres,
        apellidos,
        fecha_nacimiento,
        sexo,
        ubicacion_id: parseInt(ubicacion_id, 10),
        correo_acceso: correoNormalizado || undefined,
        password,
        rol,
        persona_titular_id: persona_titular_id ? parseInt(persona_titular_id, 10) : undefined,
        nombre_contacto,
        parentesco,
        meta_actividad_minutos: meta_actividad_minutos ? parseInt(meta_actividad_minutos, 10) : undefined,
        meta_social_dias: meta_social_dias ? parseInt(meta_social_dias, 10) : undefined,
        meta_pa_sistolica: meta_pa_sistolica ? parseFloat(meta_pa_sistolica) : undefined,
        meta_pa_diastolica: meta_pa_diastolica ? parseFloat(meta_pa_diastolica) : undefined,
        meta_glucosa_min: meta_glucosa_min ? parseFloat(meta_glucosa_min) : undefined,
        meta_glucosa_max: meta_glucosa_max ? parseFloat(meta_glucosa_max) : undefined,
        meta_colesterol_max: meta_colesterol_max ? parseFloat(meta_colesterol_max) : undefined,
        meta_imc_min: meta_imc_min ? parseFloat(meta_imc_min) : undefined,
        meta_imc_max: meta_imc_max ? parseFloat(meta_imc_max) : undefined,
      });

      res.status(201).json({
        success: true,
        data: { message: 'Usuario registrado exitosamente en el sistema.', ...result },
      });
    } catch (error: any) {
      if (error?.number === 2627 || error?.message?.includes('UNIQUE KEY')) {
        res.status(400).json({ success: false, error: { message: 'El correo electrónico ya se encuentra registrado por otra cuenta.' } });
        return;
      }
      next(error);
    }
  };

  actualizarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = parseInt(req.params.id, 10);
      const {
        cuenta_id,
        nombres,
        apellidos,
        fecha_nacimiento,
        sexo,
        ubicacion_id,
        activo,
        correo_acceso,
        password,
        rol,
        nombre_contacto,
        parentesco,
        meta_actividad_minutos,
        meta_social_dias,
        meta_pa_sistolica,
        meta_pa_diastolica,
        meta_glucosa_min,
        meta_glucosa_max,
        meta_colesterol_max,
        meta_imc_min,
        meta_imc_max,
      } = req.body;

      const correoNormalizado = normalizeEmail(correo_acceso);
      if (correoNormalizado && !isValidEmail(correoNormalizado)) {
        res.status(400).json({ success: false, error: { message: 'El correo electrónico no es válido.' } });
        return;
      }

      const passwordError = password ? passwordPolicyError(password) : null;
      if (passwordError) {
        res.status(400).json({ success: false, error: { message: passwordError } });
        return;
      }

      await this.adminRepo.actualizarUsuario({
        persona_id: personaId,
        cuenta_id: cuenta_id ? parseInt(cuenta_id, 10) : null,
        nombres,
        apellidos,
        fecha_nacimiento,
        sexo,
        ubicacion_id: parseInt(ubicacion_id, 10),
        activo: activo !== undefined ? Boolean(activo) : true,
        correo_acceso: correoNormalizado || undefined,
        password,
        rol,
        nombre_contacto,
        parentesco,
        meta_actividad_minutos: meta_actividad_minutos ? parseInt(meta_actividad_minutos, 10) : undefined,
        meta_social_dias: meta_social_dias ? parseInt(meta_social_dias, 10) : undefined,
        meta_pa_sistolica: meta_pa_sistolica ? parseFloat(meta_pa_sistolica) : undefined,
        meta_pa_diastolica: meta_pa_diastolica ? parseFloat(meta_pa_diastolica) : undefined,
        meta_glucosa_min: meta_glucosa_min ? parseFloat(meta_glucosa_min) : undefined,
        meta_glucosa_max: meta_glucosa_max ? parseFloat(meta_glucosa_max) : undefined,
        meta_colesterol_max: meta_colesterol_max ? parseFloat(meta_colesterol_max) : undefined,
        meta_imc_min: meta_imc_min ? parseFloat(meta_imc_min) : undefined,
        meta_imc_max: meta_imc_max ? parseFloat(meta_imc_max) : undefined,
      });

      res.json({ success: true, data: { message: 'Usuario actualizado correctamente.' } });
    } catch (error) {
      next(error);
    }
  };

  getMetasTitular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = parseInt(req.params.personaId, 10);
      const metas = await this.adminRepo.getMetasTitular(personaId);
      res.json({ success: true, data: metas });
    } catch (error) {
      next(error);
    }
  };

  actualizarMetasTitular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = parseInt(req.params.personaId, 10);
      await this.adminRepo.actualizarMetasTitular(personaId, req.body);
      res.json({ success: true, data: { message: 'Metas actualizadas correctamente.' } });
    } catch (error) {
      next(error);
    }
  };

  toggleActivoUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = parseInt(req.params.id, 10);
      const cuentaId = req.query.cuenta_id ? parseInt(req.query.cuenta_id as string, 10) : undefined;
      const activo = await this.adminRepo.toggleActivoUsuario(personaId, cuentaId);
      res.json({ success: true, data: { message: `Usuario ${activo ? 'activado' : 'inactivado'} correctamente.`, activo } });
    } catch (error) {
      next(error);
    }
  };

  eliminarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = parseInt(req.params.id, 10);
      const cuentaId = req.query.cuenta_id ? parseInt(req.query.cuenta_id as string, 10) : undefined;
      const resElim = await this.adminRepo.eliminarUsuario(personaId, cuentaId);
      res.json({ success: true, data: resElim });
    } catch (error) {
      next(error);
    }
  };
}
