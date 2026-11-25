import { HabitoRepository } from '../repositories/habito.repository';
import { ControlRepository } from '../repositories/control.repository';
import { ESTADOS_KPI } from '../config/constants';
import { getMondayOfCurrentWeek, getSundayOfCurrentWeek, getFirstDayOfMonth } from '../utils/dateUtils';

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
    const hoyStr = new Date().toISOString().split('T')[0];

    // Verificar si hay días pasados sin confirmar
    const diasConfirmados = new Set(confirmaciones.filter(c => c.habito === 'ACTIVIDAD_FISICA').map(c => c.fecha));
    let diasSinConfirmarPasados = 0;

    // Iterar días de la semana hasta hoy (o todos los 7 si la semana ya terminó)
    const baseDate = new Date(monday + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() + i);
      const curStr = cur.toISOString().split('T')[0];
      if (curStr <= hoyStr) {
        if (!diasConfirmados.has(curStr)) {
          // Si hubo sesión ese día, cuenta como confirmado
          const tieneSesion = sesiones.some(s => s.fecha_hora.toISOString?.().split('T')[0] === curStr || String(s.fecha_hora).startsWith(curStr));
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

    // Calcular porcentaje
    const porcentaje = Math.round((totalMinutos / meta.valor_meta) * 1000) / 10; // 1 decimal

    // Determinar estado
    let estado: typeof ESTADOS_KPI[keyof typeof ESTADOS_KPI] = ESTADOS_KPI.AVANCE_INICIAL;
    let frase = `¡Buen comienzo! Llevas ${totalMinutos} de ${meta.valor_meta} min. Cada caminata suma para tu salud cerebral.`;

    if (totalMinutos === 0) {
      estado = ESTADOS_KPI.SIN_ACTIVIDAD_CONFIRMADO;
      frase = 'Aún no registras actividad física esta semana. ¡Anímate a dar una caminata ligera hoy!';
    } else if (porcentaje >= 80) {
      estado = ESTADOS_KPI.META_LOGRADA;
      frase = `¡Excelente trabajo! Has completado ${porcentaje}% de tu meta (${totalMinutos} min). Tu constancia protege tu cerebro.`;
    } else if (porcentaje >= 50) {
      estado = ESTADOS_KPI.EN_PROGRESO;
      const faltan = meta.valor_meta - totalMinutos;
      frase = `¡Vas muy bien! Estás al ${porcentaje}% de tu meta. Solo te faltan ${faltan > 0 ? faltan : 0} min para la meta dorada.`;
    }

    return {
      codigoKpi: 'CAF',
      titulo: 'Actividad Física Semanal',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: totalMinutos,
      denominador: meta.valor_meta,
      unidad: 'minutos',
      estado,
      mensajeMotivador: frase,
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
      contactos.map(c => {
        const d = c.fecha_hora;
        return typeof d === 'string' ? d.split('T')[0].split(' ')[0] : d.toISOString().split('T')[0];
      })
    );
    const diasConContacto = fechasUnicas.size;

    // 3. Confirmaciones diarias
    const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, monday, sunday);
    const hoyStr = new Date().toISOString().split('T')[0];
    const diasConfirmados = new Set(confirmaciones.filter(c => c.habito === 'CONTACTO_SOCIAL').map(c => c.fecha));

    let diasSinConfirmarPasados = 0;
    const baseDate = new Date(monday + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() + i);
      const curStr = cur.toISOString().split('T')[0];
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

    const porcentaje = Math.round((diasConContacto / meta.valor_meta) * 1000) / 10;

    let estado: typeof ESTADOS_KPI[keyof typeof ESTADOS_KPI] = ESTADOS_KPI.AVANCE_INICIAL;
    let frase = `Has conectado ${diasConContacto} de ${meta.valor_meta} días. El contacto cercano nutre las redes neuronales.`;

    if (diasConContacto === 0) {
      estado = ESTADOS_KPI.SIN_ACTIVIDAD_CONFIRMADO;
      frase = 'No registraste contacto social esta semana. Una breve llamada o café con un amigo marca la diferencia.';
    } else if (porcentaje >= 80) {
      estado = ESTADOS_KPI.META_LOGRADA;
      frase = `¡Excelente! Has alcanzado ${porcentaje}% de tu meta de conexión social (${diasConContacto} días).`;
    } else if (porcentaje >= 50) {
      estado = ESTADOS_KPI.EN_PROGRESO;
      frase = `¡Muy buen avance! ${diasConContacto} días de interacción esta semana. ¡Sigue fortaleciendo tus lazos!`;
    }

    return {
      codigoKpi: 'CCS',
      titulo: 'Contacto Social Semanal',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: diasConContacto,
      denominador: meta.valor_meta,
      unidad: 'días',
      estado,
      mensajeMotivador: frase,
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

    const porcentaje = Math.round((enMeta / totalProgramados) * 1000) / 10;

    let estado: typeof ESTADOS_KPI[keyof typeof ESTADOS_KPI] = ESTADOS_KPI.AVANCE_INICIAL;
    let frase = `${enMeta} de ${totalProgramados} controles dentro de los rangos clínicos óptimos.`;

    if (conResultado === 0) {
      estado = ESTADOS_KPI.DATOS_PENDIENTES;
      frase = 'Tienes controles pendientes por realizar este mes. Recuerda medir tu presión, glucosa o IMC.';
    } else if (porcentaje >= 75) {
      estado = ESTADOS_KPI.META_LOGRADA;
      frase = `¡Excelente control cardiometabólico! (${enMeta}/${totalProgramados} en meta). La salud cardiovascular protege tu cerebro.`;
    } else if (porcentaje >= 50) {
      estado = ESTADOS_KPI.EN_PROGRESO;
      frase = `Control en progreso (${enMeta}/${totalProgramados}). Mantén una dieta saludable y hábitos activos.`;
    } else if (enMeta === 0 && conResultado > 0) {
      estado = ESTADOS_KPI.SIN_ACTIVIDAD_CONFIRMADO;
      frase = 'Ninguno de los controles registrados está actualmente en rango ideal. Consulta a tu médico de cabecera.';
    }

    return {
      codigoKpi: 'FCM',
      titulo: 'Controles Cardiometabólicos',
      porcentaje,
      porcentajeTexto: `${porcentaje}%`,
      numerador: enMeta,
      denominador: totalProgramados,
      unidad: 'controles',
      estado,
      mensajeMotivador: frase,
      esEvaluable: true,
      detalles: controles,
    };
  }
}
