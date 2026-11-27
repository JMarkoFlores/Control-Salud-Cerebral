import {
  ControlRow,
  FcmRow,
  IndicatorRow,
  MetaInfo,
  WeeklyRow
} from '../../types';
import { addDays, endOfMonth, isoWeekNumber, monthOf, yearOf } from '../../utils/date';
import { indicatorState, round } from '../../utils/calc';

export const MOCK_CUTOFF = '2026-11-26';

interface DistrictSeed {
  departamento: string;
  provincia: string;
  distrito: string;
  lat: number;
  lng: number;
}

export const DISTRICTS: DistrictSeed[] = [
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', lat: -8.1116778, lng: -79.0287742 },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Víctor Larco Herrera', lat: -8.1402263, lng: -79.0447475 },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Huanchaco', lat: -8.0800318, lng: -79.1204769 },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'La Esperanza', lat: -8.0795, lng: -79.0575 },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'El Porvenir', lat: -8.0885, lng: -79.0135 },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Moche', lat: -8.1705, lng: -79.0105 }
];

const FACTORS = [
  { tipo: 'Presión arterial', id: 'CONTROL_PRESION', unidad: 'mmHg', criterio: '< 130/80' },
  { tipo: 'Glucosa', id: 'CONTROL_GLUCOSA', unidad: 'mg/dL', criterio: '< 100' },
  { tipo: 'Colesterol LDL', id: 'CONTROL_LDL', unidad: 'mg/dL', criterio: '< 130' },
  { tipo: 'IMC', id: 'CONTROL_IMC', unidad: 'kg/m²', criterio: '18,5 - 24,9' }
] as const;

const DATA_STATES = {
  habits: ['CONFIRMADO', 'EN_CURSO', 'PENDIENTE', 'SIN_META'] as const,
  controls: [
    'DENTRO_META',
    'FUERA_META',
    'PENDIENTE',
    'META_INCOMPLETA',
    'NO_PROGRAMADO',
    'SIN_META',
    'NO_VIGENTE'
  ] as const
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = mulberry32(20261126);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function buildWeeks(): string[] {
  const weeks: string[] = [];
  let current = '2026-08-03';
  while (current <= '2026-11-23') {
    weeks.push(current);
    current = addDays(current, 7);
  }
  return weeks;
}

function buildMonths(): string[] {
  return ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'];
}

interface ParticipantSeed {
  key_persona: number;
  sexo: string;
  estado_persona: string;
  distrito: DistrictSeed;
  edad: number;
  grupo_edad: string;
  propensity: number;
}

function buildParticipants(): ParticipantSeed[] {
  const participants: ParticipantSeed[] = [];
  for (let i = 1; i <= 30; i += 1) {
    const edad = 30 + ((i * 7) % 36);
    const grupo =
      edad <= 39 ? '30-39' : edad <= 49 ? '40-49' : edad <= 59 ? '50-59' : '60-65';
    participants.push({
      key_persona: i,
      sexo: i % 2 === 0 ? 'F' : 'M',
      estado_persona: i % 9 === 0 ? 'INACTIVO' : 'ACTIVO',
      distrito: DISTRICTS[(i - 1) % DISTRICTS.length],
      edad,
      grupo_edad: grupo,
      propensity: 0.55 + ((i * 17) % 70) / 100
    });
  }
  return participants;
}

const participants = buildParticipants();
const weeks = buildWeeks();
const months = buildMonths();

function baseFields(participant: ParticipantSeed, periodo: string, finPeriodo: string, fechaCorte: string) {
  return {
    key_persona: participant.key_persona,
    sexo: participant.sexo,
    estado_persona: participant.estado_persona,
    pais: 'Perú',
    departamento: participant.distrito.departamento,
    provincia: participant.distrito.provincia,
    distrito: participant.distrito.distrito,
    edad: participant.edad,
    grupo_edad: participant.grupo_edad,
    en_rango_edad: 1,
    periodo,
    fin_periodo: finPeriodo,
    fecha_corte: fechaCorte,
    periodo_cerrado: finPeriodo < fechaCorte ? 1 : 0
  };
}

function weeklyEstadoDatos(closed: boolean): (typeof DATA_STATES.habits)[number] {
  const value = random();
  if (!closed) return value < 0.6 ? 'EN_CURSO' : 'PENDIENTE';
  if (value < 0.82) return 'CONFIRMADO';
  if (value < 0.92) return 'PENDIENTE';
  return 'SIN_META';
}

function buildWeeklyRows(): WeeklyRow[] {
  const rows: WeeklyRow[] = [];

  for (const participant of participants) {
    for (const week of weeks) {
      const fin = addDays(week, 6);
      const closed = fin < MOCK_CUTOFF;
      const base = baseFields(participant, week, fin, MOCK_CUTOFF);
      const anio = yearOf(week);
      const semana = isoWeekNumber(week);

      for (const codigo of ['CAF', 'CCS'] as const) {
        const estadoDatos = weeklyEstadoDatos(closed);
        const meta = codigo === 'CAF' ? pick([120, 150, 180]) : pick([3, 4, 5]);
        const target =
          codigo === 'CAF'
            ? Math.max(0, Math.round(meta * participant.propensity * (0.75 + random() * 0.5)))
            : Math.max(0, Math.round(meta * participant.propensity * (0.8 + random() * 0.45)));

        const hasMeta = estadoDatos !== 'SIN_META';
        const numerador = hasMeta ? target : null;
        const denominador = hasMeta ? meta : null;
        const porcentaje =
          hasMeta && (estadoDatos === 'CONFIRMADO' || estadoDatos === 'EN_CURSO') && denominador
            ? round((100 * Number(numerador)) / denominador, 2)
            : null;
        const estadoIndicador =
          !hasMeta
            ? 'SIN_META'
            : porcentaje == null
              ? 'DATOS_PENDIENTES'
              : indicatorState(codigo, porcentaje);

        rows.push({
          ...base,
          codigo_indicador: codigo,
          unidad_medida: codigo === 'CAF' ? 'Minutos' : 'Días',
          anio,
          semana,
          tipo_seguimiento: codigo === 'CAF' ? 'ACTIVIDAD_FISICA' : 'CONTACTO_SOCIAL',
          id_meta: codigo === 'CAF' ? `META-CAF-${meta}` : `META-CCS-${meta}`,
          origen_meta: pick(['PROFESIONAL', 'AUTOMATICA']),
          version_meta: 1,
          minutos_realizados: codigo === 'CAF' ? numerador : null,
          meta_minutos_semanal: codigo === 'CAF' ? denominador : null,
          dias_con_contacto: codigo === 'CCS' ? numerador : null,
          meta_dias_semanal: codigo === 'CCS' ? denominador : null,
          numerador,
          denominador,
          porcentaje,
          estado_datos: estadoDatos,
          estado_indicador: estadoIndicador,
          es_evaluable: porcentaje != null ? 1 : 0
        });
      }
    }
  }

  return rows;
}

interface FactorResult {
  tipo_control: string;
  id_tipo_seguimiento: string;
  unidad: string;
  criterio_meta: string;
  estado_datos: (typeof DATA_STATES.controls)[number];
  factores_dentro_meta: number;
  factores_previstos: number;
  resultado_referencia: number | null;
  origen_resultado: string;
  estado_validacion: string;
}

function controlEstadoDatos(closed: boolean): (typeof DATA_STATES.controls)[number] {
  const value = random();
  if (!closed) {
    if (value < 0.45) return 'PENDIENTE';
    if (value < 0.6) return 'META_INCOMPLETA';
    if (value < 0.75) return 'NO_PROGRAMADO';
    return 'SIN_META';
  }
  if (value < 0.52) return 'DENTRO_META';
  if (value < 0.72) return 'FUERA_META';
  if (value < 0.82) return 'PENDIENTE';
  if (value < 0.87) return 'META_INCOMPLETA';
  if (value < 0.94) return 'NO_PROGRAMADO';
  if (value < 0.98) return 'SIN_META';
  return 'NO_VIGENTE';
}

function buildControlsAndFcm(): { controls: ControlRow[]; fcm: FcmRow[] } {
  const controls: ControlRow[] = [];
  const fcm: FcmRow[] = [];

  for (const participant of participants) {
    for (const month of months) {
      const fin = endOfMonth(month);
      const closed = fin < MOCK_CUTOFF;
      const base = baseFields(participant, month, fin, MOCK_CUTOFF);

      const factorResults: FactorResult[] = FACTORS.map((factor) => {
        const estado = controlEstadoDatos(closed);
        const previsto = ['DENTRO_META', 'FUERA_META', 'PENDIENTE', 'META_INCOMPLETA'].includes(
          estado
        )
          ? 1
          : 0;
        return {
          tipo_control: factor.tipo,
          id_tipo_seguimiento: factor.id,
          unidad: factor.unidad,
          criterio_meta: factor.criterio,
          estado_datos: estado,
          factores_dentro_meta: estado === 'DENTRO_META' ? 1 : 0,
          factores_previstos: previsto,
          resultado_referencia:
            estado === 'DENTRO_META' || estado === 'FUERA_META'
              ? round(60 + random() * 80, 1)
              : null,
          origen_resultado: pick(['AUTORREPORTE', 'DISPOSITIVO', 'LABORATORIO']),
          estado_validacion: pick(['VALIDADO', 'PENDIENTE', 'NO_REQUIERE'])
        };
      });

      for (const factor of factorResults) {
        controls.push({
          ...base,
          anio: yearOf(month),
          trimestre: Math.ceil(monthOf(month) / 3),
          mes: monthOf(month),
          id_tipo_seguimiento: factor.id_tipo_seguimiento,
          tipo_control: factor.tipo_control,
          origen_resultado: factor.origen_resultado,
          estado_validacion: factor.estado_validacion,
          resultado_referencia: factor.resultado_referencia,
          id_meta: `META-${factor.id_tipo_seguimiento}`,
          criterio_meta: factor.criterio_meta,
          unidad: factor.unidad,
          factores_dentro_meta: factor.factores_dentro_meta,
          factores_previstos: factor.factores_previstos,
          estado_datos: factor.estado_datos
        });
      }

      const numerador = factorResults.reduce((sum, factor) => sum + factor.factores_dentro_meta, 0);
      const denominador = factorResults.reduce((sum, factor) => sum + factor.factores_previstos, 0);
      const factoresEvaluados = factorResults.filter((factor) =>
        ['DENTRO_META', 'FUERA_META'].includes(factor.estado_datos)
      ).length;
      const factoresPendientes = factorResults.filter((factor) =>
        ['PENDIENTE', 'META_INCOMPLETA'].includes(factor.estado_datos)
      ).length;
      const factoresNoProgramados = factorResults.filter(
        (factor) => factor.estado_datos === 'NO_PROGRAMADO'
      ).length;
      const factoresSinSeguimiento = factorResults.filter((factor) =>
        ['SIN_META', 'NO_VIGENTE', 'NO_PROGRAMADO'].includes(factor.estado_datos)
      ).length;

      const estadoDatos =
        denominador === 0
          ? factoresNoProgramados === 4
            ? 'NO_PROGRAMADO'
            : 'SIN_META'
          : factoresPendientes > 0
            ? 'PENDIENTE'
            : 'CONFIRMADO';

      const porcentaje =
        factoresEvaluados > 0 && denominador > 0
          ? round((100 * numerador) / denominador, 2)
          : null;

      const estadoIndicador =
        denominador === 0
          ? estadoDatos
          : factoresPendientes > 0 || factoresEvaluados === 0
            ? 'DATOS_PENDIENTES'
            : indicatorState('FCM', porcentaje);

      fcm.push({
        ...base,
        codigo_indicador: 'FCM',
        unidad_medida: 'Factores',
        anio: yearOf(month),
        trimestre: Math.ceil(monthOf(month) / 3),
        mes: monthOf(month),
        numerador,
        denominador,
        porcentaje,
        estado_datos: estadoDatos,
        estado_indicador: estadoIndicador,
        es_evaluable: denominador > 0 && factoresEvaluados === denominador ? 1 : 0,
        factores_evaluados: factoresEvaluados,
        factores_pendientes: factoresPendientes,
        factores_no_programados: factoresNoProgramados,
        factores_sin_seguimiento: factoresSinSeguimiento
      });
    }
  }

  return { controls, fcm };
}

const weeklyRows = buildWeeklyRows();
const { controls: controlRows, fcm: fcmRows } = buildControlsAndFcm();

export const MOCK_WEEKLY: WeeklyRow[] = weeklyRows;
export const MOCK_FCM: FcmRow[] = fcmRows;
export const MOCK_CONTROLS: ControlRow[] = controlRows;

export const MOCK_INDICATORS: IndicatorRow[] = [
  ...weeklyRows.map<IndicatorRow>((row) => ({
    key_persona: row.key_persona,
    sexo: row.sexo,
    estado_persona: row.estado_persona,
    pais: row.pais,
    departamento: row.departamento,
    provincia: row.provincia,
    distrito: row.distrito,
    edad: row.edad,
    grupo_edad: row.grupo_edad,
    en_rango_edad: row.en_rango_edad,
    periodo: row.periodo,
    fin_periodo: row.fin_periodo,
    fecha_corte: row.fecha_corte,
    codigo_indicador: row.codigo_indicador,
    periodicidad: 'SEMANAL',
    unidad_medida: row.unidad_medida,
    numerador: row.numerador,
    denominador: row.denominador,
    porcentaje: row.porcentaje,
    estado_datos: row.estado_datos,
    estado_indicador: row.estado_indicador,
    es_evaluable: row.es_evaluable,
    periodo_cerrado: row.periodo_cerrado
  })),
  ...fcmRows.map<IndicatorRow>((row) => ({
    key_persona: row.key_persona,
    sexo: row.sexo,
    estado_persona: row.estado_persona,
    pais: row.pais,
    departamento: row.departamento,
    provincia: row.provincia,
    distrito: row.distrito,
    edad: row.edad,
    grupo_edad: row.grupo_edad,
    en_rango_edad: row.en_rango_edad,
    periodo: row.periodo,
    fin_periodo: row.fin_periodo,
    fecha_corte: row.fecha_corte,
    codigo_indicador: 'FCM',
    periodicidad: 'MENSUAL',
    unidad_medida: row.unidad_medida,
    numerador: row.numerador,
    denominador: row.denominador,
    porcentaje: row.porcentaje,
    estado_datos: row.estado_datos,
    estado_indicador: row.estado_indicador,
    es_evaluable: row.es_evaluable,
    periodo_cerrado: row.periodo_cerrado
  }))
];

function maxBy<T>(items: T[], selector: (item: T) => string | null): string | null {
  let best: string | null = null;
  for (const item of items) {
    const value = selector(item);
    if (value != null && (best == null || value > best)) best = value;
  }
  return best;
}

const lastClosedWeek = maxBy(
  weeklyRows.filter((row) => row.periodo_cerrado === 1),
  (row) => row.periodo
);
const lastClosedMonth = maxBy(
  fcmRows.filter((row) => row.periodo_cerrado === 1),
  (row) => row.periodo
);
const lastClosedWeekInLastClosedMonth =
  lastClosedMonth == null
    ? lastClosedWeek
    : maxBy(
        weeklyRows.filter(
          (row) => row.periodo_cerrado === 1 && row.periodo.slice(0, 7) === lastClosedMonth.slice(0, 7)
        ),
        (row) => row.periodo
      );

export const MOCK_META: MetaInfo = {
  source: 'mock',
  fechaCorte: MOCK_CUTOFF,
  lastClosedWeek,
  lastClosedMonth,
  lastClosedWeekInLastClosedMonth,
  defaults: {
    years: lastClosedWeekInLastClosedMonth ? [yearOf(lastClosedWeekInLastClosedMonth)] : [],
    months: lastClosedWeekInLastClosedMonth ? [monthOf(lastClosedWeekInLastClosedMonth)] : [],
    weeks: lastClosedWeekInLastClosedMonth ? [lastClosedWeekInLastClosedMonth] : []
  }
};
