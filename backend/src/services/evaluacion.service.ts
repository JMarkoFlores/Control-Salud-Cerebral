import { KpiService } from './kpi.service';
import { EvaluacionRepository } from '../repositories/evaluacion.repository';
import { LogroRepository } from '../repositories/logro.repository';
import { HabitoRepository } from '../repositories/habito.repository';
import { PESOS_SALUD_CEREBRAL, CATEGORIAS_RIESGO } from '../config/constants';
import { getMondayOfCurrentWeek, getSundayOfCurrentWeek } from '../utils/dateUtils';

export class EvaluacionService {
  private kpiService = new KpiService();
  private evalRepo = new EvaluacionRepository();
  private logroRepo = new LogroRepository();
  private habitoRepo = new HabitoRepository();

  /**
   * Recalcula la evaluación de salud cerebral y evalúa logros de forma inmediata
   */
  async recalcularSaludCerebral(personaId: number): Promise<any> {
    const monday = getMondayOfCurrentWeek();
    const sunday = getSundayOfCurrentWeek();
    const periodo = `W-${monday}`;

    // 1. Obtener los 3 KPIs
    const [caf, ccs, fcm] = await Promise.all([
      this.kpiService.calcularCAF(personaId, monday),
      this.kpiService.calcularCCS(personaId, monday),
      this.kpiService.calcularFCM(personaId),
    ]);

    // Subpuntajes normalizados a 100 (con tope)
    const puntajeActividad = Math.min(100, Math.max(0, caf.porcentaje ?? 0));
    const puntajeSocial = Math.min(100, Math.max(0, ccs.porcentaje ?? 0));
    const puntajeCardiometabolico = Math.min(100, Math.max(0, fcm.porcentaje ?? 0));

    // Puntaje total ponderado
    const puntajeTotalRaw =
      (puntajeActividad * PESOS_SALUD_CEREBRAL.ACTIVIDAD_FISICA) +
      (puntajeSocial * PESOS_SALUD_CEREBRAL.CONTACTO_SOCIAL) +
      (puntajeCardiometabolico * PESOS_SALUD_CEREBRAL.CARDIOMETABOLICO);

    const puntajeTotal = Math.round(puntajeTotalRaw * 10) / 10;

    // Categoría de riesgo
    let categoriaRiesgo: 'BAJO' | 'MODERADO' | 'ALTO' = 'ALTO';
    if (puntajeTotal >= 80) {
      categoriaRiesgo = 'BAJO';
    } else if (puntajeTotal >= 50) {
      categoriaRiesgo = 'MODERADO';
    }

    // 2. Guardar en base de datos
    await this.evalRepo.saveEvaluacion({
      persona_id: personaId,
      periodo_referencia: periodo,
      puntaje_total: puntajeTotal,
      puntaje_actividad: puntajeActividad,
      puntaje_social: puntajeSocial,
      puntaje_cardiometabolico: puntajeCardiometabolico,
      categoria_riesgo: categoriaRiesgo,
      version_algoritmo: 'v1.0',
    });

    // 3. Evaluar y otorgar logros automáticamente
    await this.evaluarLogros(personaId, periodo, {
      caf,
      ccs,
      fcm,
      puntajeTotal,
      monday,
      sunday,
    });

    return {
      periodo,
      puntajeTotal,
      puntajeActividad,
      puntajeSocial,
      puntajeCardiometabolico,
      categoriaRiesgo,
      categoriaDetalle: CATEGORIAS_RIESGO[categoriaRiesgo],
      caf,
      ccs,
      fcm,
    };
  }

  private async evaluarLogros(
    personaId: number,
    periodo: string,
    data: { caf: any; ccs: any; fcm: any; puntajeTotal: number; monday: string; sunday: string }
  ): Promise<void> {
    try {
      // LOG-01: Primer Paso Activo (si tiene al menos 1 sesión válida histórica)
      const sesiones = await this.habitoRepo.getSesionesFisicas(personaId, '2020-01-01', '2030-12-31', true);
      if (sesiones.length > 0) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-01', 'PERMANENTE');
      }

      // LOG-02: Semana Dorada Física (CAF >= 100%)
      if ((data.caf.porcentaje ?? 0) >= 100) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-02', periodo);
      }

      // LOG-03: Vínculo Social Constante (CCS >= 100%)
      if ((data.ccs.porcentaje ?? 0) >= 100) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-03', periodo);
      }

      // LOG-04: Corazón y Mente Protegidos (FCM = 100%)
      if (data.fcm.porcentaje === 100) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-04', periodo);
      }

      // LOG-05: Constancia Trujillana (Todos los días de la semana confirmados)
      const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, data.monday, data.sunday);
      const diasConfirmados = new Set(confirmaciones.map(c => c.fecha));
      if (diasConfirmados.size >= 7) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-05', periodo);
      }

      // LOG-06: Puntaje de Excelencia (Puntaje Total >= 80)
      if (data.puntajeTotal >= 80) {
        await this.logroRepo.otorgarLogroSiNoExiste(personaId, 'LOG-06', periodo);
      }
    } catch (e: any) {
      console.warn('[EvaluacionService] Error al evaluar logros:', e.message);
    }
  }
}
