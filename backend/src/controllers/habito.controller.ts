import { Request, Response, NextFunction } from 'express';
import { HabitoRepository } from '../repositories/habito.repository';
import { EvaluacionService } from '../services/evaluacion.service';
import { getMondayOfCurrentWeek, getSundayOfCurrentWeek, getDaysOfWeek, formatDateYMD } from '../utils/dateUtils';

export class HabitoController {
  private habitoRepo = new HabitoRepository();
  private evalService = new EvaluacionService();

  // ---------------------------------------------------------------------------
  // METAS
  // ---------------------------------------------------------------------------
  getMetas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const monday = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();

      const [metaFisica, metaSocial, historial] = await Promise.all([
        this.habitoRepo.getMetaVigente(personaId, 'ACTIVIDAD_FISICA', monday),
        this.habitoRepo.getMetaVigente(personaId, 'CONTACTO_SOCIAL', monday),
        this.habitoRepo.getHistorialMetas(personaId),
      ]);

      res.json({
        success: true,
        data: {
          inicioSemana: monday,
          metaFisica: metaFisica || { valor_meta: 150, unidad: 'MINUTOS', vigente: 0, origen_meta: 'PERSONAL' },
          metaSocial: metaSocial || { valor_meta: 3, unidad: 'DIAS', vigente: 0, origen_meta: 'PERSONAL' },
          historial,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  guardarMeta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { habito, inicio_semana, valor_meta, unidad, origen_meta } = req.body;

      if (!habito || !inicio_semana || !valor_meta || !unidad) {
        res.status(400).json({ success: false, error: { message: 'Faltan parámetros requeridos para la meta.' } });
        return;
      }

      const result = await this.habitoRepo.saveMetaSemanal({
        persona_id: personaId,
        habito,
        inicio_semana,
        valor_meta: parseInt(valor_meta, 10),
        unidad,
        origen_meta: origen_meta || 'PERSONAL',
      });

      // Recalcular salud cerebral
      await this.evalService.recalcularSaludCerebral(personaId);

      res.status(201).json({
        success: true,
        data: { message: 'Meta semanal guardada exitosamente.', ...result },
      });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // SESIONES FISICAS
  // ---------------------------------------------------------------------------
  getSesionesFisicas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const monday = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();
      const sunday = getSundayOfCurrentWeek(new Date(monday + 'T00:00:00'));

      const sesiones = await this.habitoRepo.getSesionesFisicas(personaId, monday, sunday, false);
      res.json({ success: true, data: sesiones });
    } catch (error) {
      next(error);
    }
  };

  crearSesionFisica = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { fecha_hora, tipo_actividad, duracion_minutos, origen } = req.body;

      if (!fecha_hora || !tipo_actividad || !duracion_minutos) {
        res.status(400).json({ success: false, error: { message: 'Fecha, tipo de actividad y duración son obligatorios.' } });
        return;
      }

      const sesionId = await this.habitoRepo.insertSesionFisica({
        persona_id: personaId,
        fecha_hora,
        tipo_actividad,
        duracion_minutos: parseInt(duracion_minutos, 10),
        origen: origen || 'Autorreporte',
      });

      // Auto-confirmar el día correspondiente
      const fechaCorta = typeof fecha_hora === 'string' ? fecha_hora.slice(0, 10) : formatDateYMD(fecha_hora);
      await this.habitoRepo.upsertConfirmacionDiaria({
        persona_id: personaId,
        fecha: fechaCorta,
        habito: 'ACTIVIDAD_FISICA',
        estado_confirmacion: 'CONFIRMADO_CON_REGISTRO',
      });

      // Recalcular y evaluar logros inmediatamente
      await this.evalService.recalcularSaludCerebral(personaId);

      res.status(201).json({
        success: true,
        data: { message: 'Sesión de actividad física registrada correctamente.', sesionId },
      });
    } catch (error) {
      next(error);
    }
  };

  anularSesionFisica = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const sesionId = parseInt(req.params.id, 10);

      const ok = await this.habitoRepo.anularSesionFisica(sesionId, personaId);
      if (!ok) {
        res.status(404).json({ success: false, error: { message: 'Sesión no encontrada o ya anulada.' } });
        return;
      }

      // Recalcular automáticamente
      await this.evalService.recalcularSaludCerebral(personaId);

      res.json({ success: true, data: { message: 'Sesión anulada correctamente.' } });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // CONTACTO SOCIAL
  // ---------------------------------------------------------------------------
  getContactosSociales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const monday = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();
      const sunday = getSundayOfCurrentWeek(new Date(monday + 'T00:00:00'));

      const contactos = await this.habitoRepo.getContactosSociales(personaId, monday, sunday, false);
      res.json({ success: true, data: contactos });
    } catch (error) {
      next(error);
    }
  };

  crearContactoSocial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { fecha_hora, modalidad, origen } = req.body;

      if (!fecha_hora || !modalidad) {
        res.status(400).json({ success: false, error: { message: 'Fecha y modalidad son obligatorias.' } });
        return;
      }

      const contactoId = await this.habitoRepo.insertContactoSocial({
        persona_id: personaId,
        fecha_hora,
        modalidad,
        origen: origen || 'Autorreporte',
      });

      // Auto-confirmar el día
      const fechaCorta = typeof fecha_hora === 'string' ? fecha_hora.slice(0, 10) : formatDateYMD(fecha_hora);
      await this.habitoRepo.upsertConfirmacionDiaria({
        persona_id: personaId,
        fecha: fechaCorta,
        habito: 'CONTACTO_SOCIAL',
        estado_confirmacion: 'CONFIRMADO_CON_REGISTRO',
      });

      // Recalcular
      await this.evalService.recalcularSaludCerebral(personaId);

      res.status(201).json({
        success: true,
        data: { message: 'Interacción social registrada correctamente.', contactoId },
      });
    } catch (error) {
      next(error);
    }
  };

  anularContactoSocial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const contactoId = parseInt(req.params.id, 10);

      const ok = await this.habitoRepo.anularContactoSocial(contactoId, personaId);
      if (!ok) {
        res.status(404).json({ success: false, error: { message: 'Contacto no encontrado o ya anulado.' } });
        return;
      }

      await this.evalService.recalcularSaludCerebral(personaId);
      res.json({ success: true, data: { message: 'Contacto social anulado correctamente.' } });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // CONFIRMACION DIARIA
  // ---------------------------------------------------------------------------
  getPanelConfirmacionSemana = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const monday = (req.query.inicio_semana as string) || getMondayOfCurrentWeek();
      const sunday = getSundayOfCurrentWeek(new Date(monday + 'T00:00:00'));

      const [confirmaciones, sesiones, contactos] = await Promise.all([
        this.habitoRepo.getConfirmacionesSemana(personaId, monday, sunday),
        this.habitoRepo.getSesionesFisicas(personaId, monday, sunday, true),
        this.habitoRepo.getContactosSociales(personaId, monday, sunday, true),
      ]);

      const diasSemana = getDaysOfWeek(monday);

      // Mapear cada día con su estado para actividad física y contacto social
      const panel = diasSemana.map(d => {
        const confAct = confirmaciones.find(c => c.fecha === d.fecha && c.habito === 'ACTIVIDAD_FISICA');
        const confSoc = confirmaciones.find(c => c.fecha === d.fecha && c.habito === 'CONTACTO_SOCIAL');

        const sesionesDia = sesiones.filter(s => {
          const sFecha = typeof s.fecha_hora === 'string' ? s.fecha_hora.slice(0, 10) : formatDateYMD(s.fecha_hora);
          return sFecha === d.fecha;
        });

        const contactosDia = contactos.filter(c => {
          const cFecha = typeof c.fecha_hora === 'string' ? c.fecha_hora.slice(0, 10) : formatDateYMD(c.fecha_hora);
          return cFecha === d.fecha;
        });

        return {
          fecha: d.fecha,
          nombreDia: d.nombreDia,
          esHoy: d.esHoy,
          esPasado: d.esPasado,
          esFuturo: d.esFuturo,
          actividadFisica: {
            estado: confAct ? confAct.estado_confirmacion : (sesionesDia.length > 0 ? 'CONFIRMADO_CON_REGISTRO' : (d.esFuturo ? 'FUTURO' : 'PENDIENTE')),
            minutos: sesionesDia.reduce((sum, s) => sum + s.duracion_minutos, 0),
            conteo: sesionesDia.length,
          },
          contactoSocial: {
            estado: confSoc ? confSoc.estado_confirmacion : (contactosDia.length > 0 ? 'CONFIRMADO_CON_REGISTRO' : (d.esFuturo ? 'FUTURO' : 'PENDIENTE')),
            conteo: contactosDia.length,
          },
        };
      });

      res.json({ success: true, data: { inicioSemana: monday, finSemana: sunday, panel } });
    } catch (error) {
      next(error);
    }
  };

  confirmarDia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { fecha, habito, estado_confirmacion } = req.body;

      if (!fecha || !habito || !estado_confirmacion) {
        res.status(400).json({ success: false, error: { message: 'Fecha, hábito y estado de confirmación son obligatorios.' } });
        return;
      }

      await this.habitoRepo.upsertConfirmacionDiaria({
        persona_id: personaId,
        fecha,
        habito,
        estado_confirmacion,
      });

      await this.evalService.recalcularSaludCerebral(personaId);

      res.json({ success: true, data: { message: 'Confirmación diaria guardada correctamente.' } });
    } catch (error) {
      next(error);
    }
  };
}
