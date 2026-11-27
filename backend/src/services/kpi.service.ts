import { HabitoRepository } from '../repositories/habito.repository';
import { ControlRepository } from '../repositories/control.repository';
import { ESTADOS_KPI, clasificarIndicador } from '../config/constants';
import { getMondayOfCurrentWeek, getSundayOfCurrentWeek, getFirstDayOfMonth, getTodayString, formatDateYMD, parseToDate } from '../utils/dateUtils';

export interface KpiResult {
  codigoKpi: 'CAF' | 'CCS' | 'FCM';
  titulo: string;
  porcentaje: number | null; // null si es DATOS_PENDIENTES o SIN_META
  porcentajeTexto: string;
  numerador: number;
  denominador: number;
  unidad: string;
  estado: typeof ESTADOS_KPI[keyof typeof ESTADOS_KPI];
  mensajeMotivador: string;
  esEvaluable: boolean;
  diasPendientes?: number;
  detalles?: any;
}

export class KpiService {
  private habitoRepo = new HabitoRepository();
  private controlRepo = new ControlRepository();

  /**
   * Calcula el CAF (Cumplimiento de Actividad Física)
   */
  async calcularCAF(personaId: number, inicioSemana?: string): Promise<KpiResult> {
    const monday = inicioSemana || getMondayOfCurrentWeek();
    const sunday = getSundayOfCurrentWeek(new Date(monday + 'T00:00:00'));

    // 1. Meta semanal vigente
    const meta = await this.habitoRepo.getMetaVigente(personaId, 'ACTIVIDAD_FISICA', monday);
    if (!meta) {
      return {
        codigoKpi: 'CAF',
        titulo: 'Actividad Física Semanal',
        porcentaje: null,
        porcentajeTexto: '—',
        numerador: 0,
        denominador: 0,
        unidad: 'minutos',
        estado: ESTADOS_KPI.SIN_META,
        mensajeMotivador: ESTADOS_KPI.SIN_META.descripcionMotivacional,
        esEvaluable: false,
      };
    }

    // 2. Sesiones válidas
    const sesiones = await this.habitoRepo.getSesionesFisicas(personaId, monday, sunday, true);
    const totalMinutos = sesiones.reduce((sum, s) => sum + s.duracion_minutos, 0);

    // 3. Confirmaciones diarias de la semana
    const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, monday, sunday);
    const hoyStr = getTodayString();

    // Verificar si hay días pasados sin confirmar
    const diasConfirmados = new Set(confirmaciones.filter(c => c.habito === 'ACTIVIDAD_FISICA').map(c => c.fecha));
    let diasSinConfirmarPasados = 0;

    // Iterar días de la semana hasta hoy (o todos los 7 si la semana ya terminó)
    const baseDate = parseToDate(`${monday} 00:00:00`);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() + i);
      const curStr = formatDateYMD(cur);
      if (curStr <= hoyStr) {
        if (!diasConfirmados.has(curStr)) {
          // Si hubo sesión ese día, cuenta como confirmado
          const tieneSesion = sesiones.some(s => {
            const sDate = typeof s.fecha_hora === 'string' ? s.fecha_hora.slice(0, 10) : formatDateYMD(s.fecha_hora);
            return sDate === curStr;
          });
          if (!tieneSesion) {
            diasSinConfirmarPasados++;
          }
        }
      }
    }

    // Si la semana ya cerró y faltan confirmaciones -> DATOS_PENDIENTES
    const semanaCerrada = sunday < hoyStr;
    if (semanaCerrada && diasSinConfirmarPasados > 0) {
      return {
        codigoKpi: 'CAF',
        titulo: 'Actividad Física Semanal',
        porcentaje: null,
        porcentajeTexto: '—',
        numerador: totalMinutos,
        denominador: meta.valor_meta,
        unidad: 'minutos',
        estado: ESTADOS_KPI.DATOS_PENDIENTES,
        mensajeMotivador: 'Semana con datos pendientes por confirmar. Regulariza tus registros.',
        esEvaluable: false,
        diasPendientes: diasSinConfirmarPasados,
      };
    }

    // Calcular porcentaje y clasificar con el valor sin redondear.
    const porcentajeCrudo = (totalMinutos / meta.valor_meta) * 100;
    const porcentaje = Math.round(porcentajeCrudo * 10) / 10; // 1 decimal para mostrar
    const estado = ESTADOS_KPI[clasificarIndicador('CAF', porcentajeCrudo)];

    return {
      codigoKpi: 'CAF',
      titulo: 'Actividad Física Semanal',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: totalMinutos,
      denominador: meta.valor_meta,
      unidad: 'minutos',
      estado,
      mensajeMotivador: totalMinutos === 0
        ? 'No registraste actividad física esta semana. ¡Anímate a dar una caminata ligera hoy!'
        : `Llevas ${totalMinutos} de ${meta.valor_meta} min. ${estado.descripcionMotivacional}`,
      esEvaluable: true,
      diasPendientes: diasSinConfirmarPasados,
    };
  }

  /**
   * Calcula el CCS (Cumplimiento de Contacto Social)
   */
  async calcularCCS(personaId: number, inicioSemana?: string): Promise<KpiResult> {
    const monday = inicioSemana || getMondayOfCurrentWeek();
    const sunday = getSundayOfCurrentWeek(new Date(monday + 'T00:00:00'));

    // 1. Meta semanal vigente
    const meta = await this.habitoRepo.getMetaVigente(personaId, 'CONTACTO_SOCIAL', monday);
    if (!meta) {
      return {
        codigoKpi: 'CCS',
        titulo: 'Contacto Social Semanal',
        porcentaje: null,
        porcentajeTexto: '—',
        numerador: 0,
        denominador: 0,
        unidad: 'días',
        estado: ESTADOS_KPI.SIN_META,
        mensajeMotivador: ESTADOS_KPI.SIN_META.descripcionMotivacional,
        esEvaluable: false,
      };
    }

    // 2. Contactos válidos: Múltiples contactos en el mismo día cuentan como 1 solo día
    const contactos = await this.habitoRepo.getContactosSociales(personaId, monday, sunday, true);
    const fechasUnicas = new Set(
      contactos.map(c => typeof c.fecha_hora === 'string' ? c.fecha_hora.slice(0, 10) : formatDateYMD(c.fecha_hora))
    );
    const diasConContacto = fechasUnicas.size;

    // 3. Confirmaciones diarias
    const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, monday, sunday);
    const hoyStr = getTodayString();
    const diasConfirmados = new Set(confirmaciones.filter(c => c.habito === 'CONTACTO_SOCIAL').map(c => c.fecha));

    let diasSinConfirmarPasados = 0;
    const baseDate = parseToDate(`${monday} 00:00:00`);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() + i);
      const curStr = formatDateYMD(cur);
      if (curStr <= hoyStr) {
        if (!diasConfirmados.has(curStr) && !fechasUnicas.has(curStr)) {
          diasSinConfirmarPasados++;
        }
      }
    }

    const semanaCerrada = sunday < hoyStr;
    if (semanaCerrada && diasSinConfirmarPasados > 0) {
      return {
        codigoKpi: 'CCS',
        titulo: 'Contacto Social Semanal',
        porcentaje: null,
        porcentajeTexto: '—',
        numerador: diasConContacto,
        denominador: meta.valor_meta,
        unidad: 'días',
        estado: ESTADOS_KPI.DATOS_PENDIENTES,
        mensajeMotivador: 'Semana con datos pendientes por confirmar.',
        esEvaluable: false,
        diasPendientes: diasSinConfirmarPasados,
      };
    }

    const porcentajeCrudo = (diasConContacto / meta.valor_meta) * 100;
    const porcentaje = Math.round(porcentajeCrudo * 10) / 10;
    const estado = ESTADOS_KPI[clasificarIndicador('CCS', porcentajeCrudo)];

    return {
      codigoKpi: 'CCS',
      titulo: 'Contacto Social Semanal',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: diasConContacto,
      denominador: meta.valor_meta,
      unidad: 'días',
      estado,
      mensajeMotivador: diasConContacto === 0
        ? 'No registraste contacto social esta semana. Una breve llamada o café con un amigo marca la diferencia.'
        : `Has conectado ${diasConContacto} de ${meta.valor_meta} días. ${estado.descripcionMotivacional}`,
      esEvaluable: true,
      diasPendientes: diasSinConfirmarPasados,
    };
  }

  /**
   * Calcula el FCM (Factores Cardiometabólicos en Meta)
   */
  async calcularFCM(personaId: number, mesPeriodo?: string): Promise<KpiResult> {
    const primerDiaMes = mesPeriodo || getFirstDayOfMonth();
    const controles = await this.controlRepo.getControlesProgramadosMes(personaId, primerDiaMes);

    if (controles.length === 0) {
      return {
        codigoKpi: 'FCM',
        titulo: 'Controles Cardiometabólicos',
        porcentaje: null,
        porcentajeTexto: '—',
        numerador: 0,
        denominador: 0,
        unidad: 'controles',
        estado: ESTADOS_KPI.SIN_META,
        mensajeMotivador: 'No tienes controles programados para este mes en tu agenda médica.',
        esEvaluable: false,
      };
    }

    const totalProgramados = controles.length;
    const enMeta = controles.filter(c => c.dentro_de_meta === 1 || c.dentro_de_meta === true).length;
    const conResultado = controles.filter(c => c.resultado_id !== null).length;
    const porcentajeCrudo = (enMeta / totalProgramados) * 100;
    const porcentaje = Math.round(porcentajeCrudo * 10) / 10;
    const pendientes = totalProgramados - conResultado;
    // El informe sólo evalúa FCM cuando todos los factores previstos tienen resultado.
    const estado = pendientes > 0
      ? ESTADOS_KPI.DATOS_PENDIENTES
      : ESTADOS_KPI[clasificarIndicador('FCM', porcentajeCrudo)];

    return {
      codigoKpi: 'FCM',
      titulo: 'Controles Cardiometabólicos',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: enMeta,
      denominador: totalProgramados,
      unidad: 'controles',
      estado,
      mensajeMotivador: pendientes > 0
        ? `Tienes ${pendientes} de ${totalProgramados} controles pendientes por realizar este mes.`
        : `${enMeta} de ${totalProgramados} controles dentro de los rangos clínicos óptimos. ${estado.descripcionMotivacional}`,
      esEvaluable: pendientes === 0,
      detalles: controles,
    };
  }
}
