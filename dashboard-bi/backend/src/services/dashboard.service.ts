import {
  ChartSpec,
  ControlRow,
  DashboardRepository,
  DashboardResponse,
  FcmRow,
  Filters,
  IndicatorCode,
  IndicatorRow,
  Kpi,
  MetaInfo,
  TableColumn,
  TableSpec,
  ViewId,
  WeeklyRow
} from '../types';
import {
  aggregate,
  aggregateBy,
  countWhere,
  formatNumber,
  formatPercent,
  INDICATOR_HELP,
  INDICATOR_LABELS,
  round,
  STATE_LABELS,
  stateLabel,
  sumField
} from '../utils/calc';
import { addMonths, formatMonthYearLabel, formatWeekLabel, startOfMonth } from '../utils/date';
import { TtlCache } from '../utils/cache';

const STATE_ORDER = [
  'OPTIMO',
  'BUENO',
  'REGULAR',
  'MALO',
  'DATOS_PENDIENTES',
  'SIN_META',
  'NO_PROGRAMADO',
  'SIN_DATOS'
];

const STATE_COLORS: Record<string, string> = {
  OPTIMO: '#065F46',
  BUENO: '#10B981',
  REGULAR: '#F59E0B',
  MALO: '#EF4444',
  DATOS_PENDIENTES: '#94A3B8',
  SIN_META: '#CBD5E1',
  NO_PROGRAMADO: '#E2E8F0',
  SIN_DATOS: '#94A3B8'
};

const PALETTE = ['#0F4C5C', '#028090', '#10B981', '#F59E0B', '#EF4444', '#64748B'];

const ORIGIN_LABELS: Record<string, string> = {
  AUTORREPORTE: 'Autorreporte',
  DISPOSITIVO: 'Dispositivo',
  CONSULTA_MEDICA: 'Consulta médica',
  LABORATORIO: 'Laboratorio'
};

const VALIDATION_LABELS: Record<string, string> = {
  VALIDADO: 'Validado',
  PENDIENTE: 'Pendiente',
  NO_REQUIERE: 'No requiere'
};

const REASON_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  META_INCOMPLETA: 'Meta incompleta',
  SIN_META: 'Sin meta',
  NO_PROGRAMADO: 'No programado',
  NO_VIGENTE: 'No vigente'
};

const REASON_ORDER = ['PENDIENTE', 'META_INCOMPLETA', 'SIN_META', 'NO_PROGRAMADO', 'NO_VIGENTE'];

const FACTOR_ORDER = ['Presión arterial', 'Glucosa', 'Colesterol LDL', 'IMC'];

function labelFrom(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

function shortDate(period: string): string {
  return `${period.slice(8, 10)}/${period.slice(5, 7)}`;
}

function monthLabel(period: string): string {
  return formatMonthYearLabel(period);
}

function makeKpi(
  id: string,
  label: string,
  value: number | null,
  format: Kpi['format'],
  state: Kpi['state'],
  help: string,
  extra: Partial<Kpi> = {}
): Kpi {
  return { id, label, value, format, state, help, ...extra };
}

function indicatorKpi(
  indicator: IndicatorCode,
  rows: Array<WeeklyRow | FcmRow | IndicatorRow>
): Kpi {
  const result = aggregate(rows, indicator);
  return makeKpi(
    indicator.toLowerCase(),
    indicator === 'CAF'
      ? 'CAF · Actividad física'
      : indicator === 'CCS'
        ? 'CCS · Contacto social'
        : 'FCM · Cardiometabólicos',
    result.percentage,
    'percent',
    result.state,
    INDICATOR_HELP[indicator],
    {
      numerator: result.numerator,
      denominator: result.denominator,
      evaluables: result.evaluables
    }
  );
}

function distributionChart(
  id: string,
  title: string,
  rows: Array<WeeklyRow | FcmRow>,
  note?: string
): ChartSpec {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const state = row.estado_indicador || 'SIN_DATOS';
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  const data: unknown[][] = [['Estado', 'Registros']];
  const colors: string[] = [];
  for (const state of STATE_ORDER) {
    const count = counts.get(state);
    if (count) {
      data.push([STATE_LABELS[state as keyof typeof STATE_LABELS] ?? state, count]);
      colors.push(STATE_COLORS[state] ?? '#94A3B8');
    }
  }
  return {
    id,
    title,
    type: 'PieChart',
    data,
    note,
    options: {
      pieHole: 0.55,
      colors,
      legend: { position: 'right' },
      chartArea: { left: 8, top: 8, width: '70%', height: '85%' }
    }
  };
}

function barByDistrict(
  id: string,
  title: string,
  rows: WeeklyRow[],
  indicator: IndicatorCode
): ChartSpec {
  const byDistrict = aggregateBy(rows, (row) => row.distrito, indicator);
  const data: unknown[][] = [['Distrito', indicator]];
  for (const [district, result] of Array.from(byDistrict.entries()).sort(
    (a, b) => (b[1].percentage ?? 0) - (a[1].percentage ?? 0)
  )) {
    data.push([district, result.percentage]);
  }
  return {
    id,
    title,
    type: 'BarChart',
    data,
    options: {
      colors: [PALETTE[0]],
      legend: { position: 'none' },
      chartArea: { left: 128, top: 8, width: '64%', height: '85%' },
      hAxis: { title: '%', viewWindow: { min: 0 } },
      vAxis: { textStyle: { fontSize: 10 } }
    }
  };
}

function columnByAgeSex(
  id: string,
  title: string,
  rows: WeeklyRow[],
  indicator: IndicatorCode
): ChartSpec {
  const bySegment = aggregateBy(
    rows,
    (row) => `${row.grupo_edad} · ${row.sexo === 'M' ? 'Masculino' : 'Femenino'}`,
    indicator
  );
  const data: unknown[][] = [['Segmento', indicator]];
  for (const [segment, result] of Array.from(bySegment.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], 'es')
  )) {
    data.push([segment, result.percentage]);
  }
  return {
    id,
    title,
    type: 'ColumnChart',
    data,
    options: {
      colors: [PALETTE[1]],
      legend: { position: 'none' },
      chartArea: { left: 48, top: 8, width: '82%', height: '72%' },
      vAxis: { title: '%', viewWindow: { min: 0 } }
    }
  };
}

function weeklyCombo(
  id: string,
  title: string,
  rows: WeeklyRow[],
  valueField: 'minutos_realizados' | 'dias_con_contacto',
  metaField: 'meta_minutos_semanal' | 'meta_dias_semanal',
  label: string,
  metaLabel: string
): ChartSpec {
  const byWeek = new Map<
    string,
    { value: number; valueCount: number; meta: number; metaCount: number }
  >();
  for (const row of rows) {
    const bucket = byWeek.get(row.periodo) ?? {
      value: 0,
      valueCount: 0,
      meta: 0,
      metaCount: 0
    };
    const value = row[valueField];
    const meta = row[metaField];
    if (value != null) {
      bucket.value += Number(value);
      bucket.valueCount += 1;
    }
    if (meta != null) {
      bucket.meta += Number(meta);
      bucket.metaCount += 1;
    }
    byWeek.set(row.periodo, bucket);
  }
  const data: unknown[][] = [['Semana', label, metaLabel]];
  for (const week of Array.from(byWeek.keys()).sort()) {
    const bucket = byWeek.get(week)!;
    data.push([
      shortDate(week),
      bucket.valueCount > 0 ? round(bucket.value, 0) : null,
      bucket.metaCount > 0 ? round(bucket.meta, 0) : null
    ]);
  }
  return {
    id,
    title,
    type: 'ComboChart',
    data,
    options: {
      seriesType: 'bars',
      series: { 1: { type: 'line', color: PALETTE[4] } },
      colors: [PALETTE[0], PALETTE[4]],
      legend: { position: 'top' },
      chartArea: { left: 52, top: 32, width: '86%', height: '68%' },
      vAxis: { title: label, viewWindow: { min: 0 } }
    }
  };
}

function weeklyTable(
  id: string,
  title: string,
  rows: WeeklyRow[],
  valueKey: 'M1' | 'M3',
  metaKey: 'M2' | 'M4',
  indicator: IndicatorCode,
  note?: string
): TableSpec {
  const columns: TableColumn[] = [
    { key: 'participante', label: 'Participante', type: 'participant' },
    { key: 'semana', label: 'Semana' },
    { key: 'realizado', label: valueKey },
    { key: 'meta', label: metaKey },
    { key: 'porcentaje', label: indicator, type: 'percent' },
    { key: 'estado', label: 'Estado', type: 'state' },
    { key: 'estado_datos', label: 'Estado de datos', type: 'state' }
  ];
  const data = [...rows]
    .sort((a, b) => (a.periodo === b.periodo ? a.key_persona - b.key_persona : b.periodo.localeCompare(a.periodo)))
    .map((row) => ({
      participante: row.key_persona,
      semana: formatWeekLabel(row.periodo),
      realizado: row.numerador,
      meta: row.denominador,
      porcentaje: row.porcentaje,
      estado: row.estado_indicador,
      estado_datos: row.estado_datos
    }));
  return { id, title, columns, rows: data, note };
}

export class DashboardService {
  private readonly cache: TtlCache<DashboardResponse>;

  constructor(
    private readonly repository: DashboardRepository,
    cacheTtlMs: number
  ) {
    this.cache = new TtlCache<DashboardResponse>(cacheTtlMs);
  }

  async getMeta(): Promise<MetaInfo> {
    return this.repository.getMeta();
  }

  async getView(view: ViewId, filters: Filters): Promise<DashboardResponse> {
    const key = `${view}:${JSON.stringify(filters)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const meta = await this.repository.getMeta();
    const response = await this.build(view, filters, meta);
    this.cache.set(key, response);
    return response;
  }

  private async build(
    view: ViewId,
    filters: Filters,
    meta: MetaInfo
  ): Promise<DashboardResponse> {
    switch (view) {
      case 'resumen':
        return this.buildResumen(filters, meta);
      case 'actividad':
        return this.buildActividad(filters, meta);
      case 'contacto':
        return this.buildContacto(filters, meta);
      case 'cardiometabolicos':
        return this.buildCardiometabolicos(filters, meta);
      case 'pendientes':
        return this.buildPendientes(filters, meta);
      case 'evolucion':
        return this.buildEvolucion(filters, meta);
      default:
        return this.buildResumen(filters, meta);
    }
  }

  private baseResponse(
    view: ViewId,
    meta: MetaInfo,
    filters: Filters,
    narrative: string,
    kpis: Kpi[],
    charts: ChartSpec[],
    tables: TableSpec[]
  ): DashboardResponse {
    return {
      view,
      source: meta.source,
      fechaCorte: meta.fechaCorte,
      filters,
      narrative,
      kpis,
      charts,
      tables,
      meta
    };
  }

  private async buildResumen(filters: Filters, meta: MetaInfo): Promise<DashboardResponse> {
    const weekly = await this.repository.getWeeklyRows(filters);
    const fcm = await this.repository.getFcmRows(filters);
    const controls = await this.repository.getControlRows(filters);
    const indicator = filters.indicator ?? 'CAF';

    const caf = aggregate(weekly.filter((row) => row.codigo_indicador === 'CAF'), 'CAF');
    const ccs = aggregate(weekly.filter((row) => row.codigo_indicador === 'CCS'), 'CCS');
    const fcmResult = aggregate(fcm, 'FCM');
    const participants = new Set<number>([
      ...weekly.map((row) => row.key_persona),
      ...fcm.map((row) => row.key_persona)
    ]);
    const pendientes = countWhere(
      [...weekly, ...fcm],
      (row) => row.estado_datos === 'PENDIENTE'
    );
    const sinMeta = countWhere(
      [...weekly, ...fcm],
      (row) => row.estado_datos === 'SIN_META' || row.estado_datos === 'NO_PROGRAMADO'
    );

    const kpis: Kpi[] = [
      indicatorKpi('CAF', weekly.filter((row) => row.codigo_indicador === 'CAF')),
      indicatorKpi('CCS', weekly.filter((row) => row.codigo_indicador === 'CCS')),
      indicatorKpi('FCM', fcm),
      makeKpi(
        'participantes',
        'Participantes',
        participants.size,
        'integer',
        'NEUTRO',
        'Personas distintas con al menos un registro en el periodo filtrado.'
      ),
      makeKpi(
        'pendientes',
        'Pendientes',
        pendientes,
        'integer',
        'DATOS_PENDIENTES',
        'Registros persona-periodo con estado de datos PENDIENTE.'
      ),
      makeKpi(
        'sinMeta',
        'Sin meta',
        sinMeta,
        'integer',
        'SIN_META',
        'Registros sin meta asignada o no programados.'
      )
    ];

    const cafByDistrict = aggregateBy(
      weekly.filter((row) => row.codigo_indicador === 'CAF'),
      (row) => row.distrito,
      'CAF'
    );
    let lowestDistrict: { name: string; percentage: number } | null = null;
    for (const [name, result] of cafByDistrict) {
      if (result.percentage == null) continue;
      if (lowestDistrict == null || result.percentage < lowestDistrict.percentage) {
        lowestDistrict = { name, percentage: result.percentage };
      }
    }

    const narrative =
      `CAF ${formatPercent(caf.percentage)} (${stateLabel(caf.state)}). ` +
      (lowestDistrict
        ? `El distrito con menor avance es ${lowestDistrict.name} (${formatPercent(lowestDistrict.percentage)}). `
        : 'No hay distritos con datos evaluables. ') +
      `${pendientes} registros pendientes y ${sinMeta} sin meta.`;

    const charts: ChartSpec[] = [
      {
        id: 'indicadores-meta',
        title: 'Indicadores frente a la meta (100 %)',
        type: 'ComboChart',
        data: [
          ['Indicador', 'Cumplimiento', 'Meta'],
          ['CAF', caf.percentage, caf.percentage == null ? null : 100],
          ['CCS', ccs.percentage, ccs.percentage == null ? null : 100],
          ['FCM', fcmResult.percentage, fcmResult.percentage == null ? null : 100]
        ],
        options: {
          seriesType: 'bars',
          series: { 1: { type: 'line', color: PALETTE[4] } },
          colors: [PALETTE[0], PALETTE[4]],
          legend: { position: 'top' },
          chartArea: { left: 48, top: 32, width: '84%', height: '68%' },
          vAxis: { title: '%', viewWindow: { min: 0 } }
        }
      },
      distributionChart(
        'estados',
        `Distribución de estados · ${INDICATOR_LABELS[indicator]} (persona-periodo)`,
        indicator === 'FCM'
          ? fcm
          : weekly.filter((row) => row.codigo_indicador === indicator)
      ),
      this.mapFallbackChart('mapa-resumen', indicator, weekly, fcm)
    ];

    const tables: TableSpec[] = [
      this.districtTable(weekly, fcm),
      this.participantTable(weekly, fcm),
      this.controlsTable(controls)
    ];

    return this.baseResponse('resumen', meta, filters, narrative, kpis, charts, tables);
  }

  private async buildActividad(filters: Filters, meta: MetaInfo): Promise<DashboardResponse> {
    let weekly = (await this.repository.getWeeklyRows(filters)).filter(
      (row) => row.codigo_indicador === 'CAF'
    );
    weekly = this.applyWeeklyViewFilters(weekly, filters);

    const result = aggregate(weekly, 'CAF');
    const m1 = sumField(weekly, (row) => row.minutos_realizados);
    const m2 = sumField(weekly, (row) => row.meta_minutos_semanal);
    const difference = round(m1 - m2, 0);

    const kpis: Kpi[] = [
      makeKpi('m1', 'M1 · Minutos realizados', m1, 'minutes', 'NEUTRO', 'Suma de minutos realizados en los registros filtrados.'),
      makeKpi('m2', 'M2 · Meta de minutos', m2, 'minutes', 'NEUTRO', 'Suma de la meta semanal de minutos de los registros filtrados.'),
      indicatorKpi('CAF', weekly),
      makeKpi(
        'evaluables',
        'Registros evaluables',
        result.evaluables,
        'integer',
        'NEUTRO',
        'Registros persona-semana con porcentaje calculable.'
      )
    ];

    const narrative =
      `${formatNumber(m1)} minutos logrados; ` +
      `${difference >= 0 ? 'excedente' : 'faltante'} de ${formatNumber(Math.abs(difference))} minutos ` +
      `respecto a una meta de ${formatNumber(m2)}.`;

    const charts: ChartSpec[] = [
      weeklyCombo(
        'minutos-semana',
        'Minutos realizados y meta por semana',
        weekly,
        'minutos_realizados',
        'meta_minutos_semanal',
        'Minutos',
        'Meta'
      ),
      distributionChart('estados-caf', 'Distribución de estados CAF', weekly),
      barByDistrict('caf-distrito', 'CAF por distrito', weekly, 'CAF'),
      columnByAgeSex('caf-edad-sexo', 'CAF por edad y sexo', weekly, 'CAF')
    ];

    const tables = [weeklyTable('detalle-caf', 'Detalle semanal de actividad física', weekly, 'M1', 'M2', 'CAF')];

    return this.baseResponse('actividad', meta, filters, narrative, kpis, charts, tables);
  }

  private async buildContacto(filters: Filters, meta: MetaInfo): Promise<DashboardResponse> {
    let weekly = (await this.repository.getWeeklyRows(filters)).filter(
      (row) => row.codigo_indicador === 'CCS'
    );
    weekly = this.applyWeeklyViewFilters(weekly, filters);

    const result = aggregate(weekly, 'CCS');
    const m3 = sumField(weekly, (row) => row.dias_con_contacto);
    const m4 = sumField(weekly, (row) => row.meta_dias_semanal);
    const difference = round(m3 - m4, 0);
    const zeroConfirmed = new Set(
      weekly
        .filter((row) => row.porcentaje === 0 && row.estado_datos === 'CONFIRMADO')
        .map((row) => row.key_persona)
    ).size;

    const kpis: Kpi[] = [
      makeKpi('m3', 'M3 · Días con contacto', m3, 'days', 'NEUTRO', 'Suma de días con contacto social en los registros filtrados.'),
      makeKpi('m4', 'M4 · Meta de días', m4, 'days', 'NEUTRO', 'Suma de la meta semanal de días de contacto.'),
      indicatorKpi('CCS', weekly),
      makeKpi(
        'evaluables',
        'Registros evaluables',
        result.evaluables,
        'integer',
        'NEUTRO',
        'Registros persona-semana con porcentaje calculable.'
      )
    ];

    const narrative =
      `${formatNumber(m3)} días con contacto; ` +
      `${difference >= 0 ? 'excedente' : 'faltante'} de ${formatNumber(Math.abs(difference))} días ` +
      `respecto a una meta de ${formatNumber(m4)}. ` +
      `${zeroConfirmed} participantes con 0 % confirmado.`;

    const charts: ChartSpec[] = [
      weeklyCombo(
        'dias-semana',
        'Días con contacto y meta por semana',
        weekly,
        'dias_con_contacto',
        'meta_dias_semanal',
        'Días',
        'Meta'
      ),
      distributionChart('estados-ccs', 'Distribución de estados CCS', weekly),
      barByDistrict('ccs-distrito', 'CCS por distrito', weekly, 'CCS'),
      columnByAgeSex('ccs-edad-sexo', 'CCS por edad y sexo', weekly, 'CCS')
    ];

    const tables = [weeklyTable('detalle-ccs', 'Detalle semanal de contacto social', weekly, 'M3', 'M4', 'CCS')];

    return this.baseResponse('contacto', meta, filters, narrative, kpis, charts, tables);
  }

  private async buildCardiometabolicos(
    filters: Filters,
    meta: MetaInfo
  ): Promise<DashboardResponse> {
    const fcmAll = await this.repository.getFcmRows(filters);
    let controls = await this.repository.getControlRows(filters);
    if (filters.controlType.length > 0) {
      controls = controls.filter((row) => filters.controlType.includes(row.tipo_control));
    }
    if (filters.resultOrigin.length > 0) {
      controls = controls.filter((row) => filters.resultOrigin.includes(row.origen_resultado));
    }
    if (filters.validation.length > 0) {
      controls = controls.filter((row) => filters.validation.includes(row.estado_validacion));
    }
    if (filters.dataState.length > 0) {
      controls = controls.filter((row) => filters.dataState.includes(row.estado_datos));
    }

    const fcmFiltered =
      filters.dataState.length > 0
        ? fcmAll.filter((row) => filters.dataState.includes(row.estado_datos))
        : fcmAll;

    const result = aggregate(fcmAll, 'FCM');
    const m5 = sumField(fcmAll, (row) => row.numerador);
    const m6 = sumField(fcmAll, (row) => row.denominador);
    const pendingFactors = sumField(fcmAll, (row) => row.factores_pendientes);

    const factorPending = new Map<string, number>();
    for (const row of controls) {
      const current = factorPending.get(row.tipo_control) ?? 0;
      const isPending = ['FUERA_META', 'PENDIENTE', 'META_INCOMPLETA'].includes(
        row.estado_datos
      );
      factorPending.set(row.tipo_control, current + (isPending ? 1 : 0));
    }
    let worstFactor: { name: string; count: number } | null = null;
    for (const [name, count] of factorPending) {
      if (worstFactor == null || count > worstFactor.count) worstFactor = { name, count };
    }

    const kpis: Kpi[] = [
      makeKpi('m5', 'M5 · Factores dentro de meta', m5, 'integer', 'NEUTRO', 'Suma de factores que alcanzaron la meta en los meses filtrados.'),
      makeKpi('m6', 'M6 · Factores previstos', m6, 'integer', 'NEUTRO', 'Suma de factores programados como denominador.'),
      indicatorKpi('FCM', fcmAll),
      makeKpi(
        'factores-pendientes',
        'Factores pendientes',
        pendingFactors,
        'integer',
        'DATOS_PENDIENTES',
        'Factores con estado PENDIENTE o META_INCOMPLETA.'
      )
    ];

    const narrative = worstFactor
      ? `El factor con más resultados fuera de meta o pendientes es ${worstFactor.name} (${worstFactor.count} registros).`
      : 'No hay factores con resultados fuera de meta o pendientes en los filtros seleccionados.';

    type FactorStateCounts = {
      dentroMeta: number;
      fueraMeta: number;
      pendiente: number;
      metaIncompleta: number;
      sinMeta: number;
      noProgramado: number;
      noVigente: number;
    };
    const factorStates = new Map<string, FactorStateCounts>();
    for (const row of controls) {
      const bucket = factorStates.get(row.tipo_control) ?? {
        dentroMeta: 0,
        fueraMeta: 0,
        pendiente: 0,
        metaIncompleta: 0,
        sinMeta: 0,
        noProgramado: 0,
        noVigente: 0
      };
      if (row.estado_datos === 'DENTRO_META') bucket.dentroMeta += 1;
      else if (row.estado_datos === 'FUERA_META') bucket.fueraMeta += 1;
      else if (row.estado_datos === 'PENDIENTE') bucket.pendiente += 1;
      else if (row.estado_datos === 'META_INCOMPLETA') bucket.metaIncompleta += 1;
      else if (row.estado_datos === 'SIN_META') bucket.sinMeta += 1;
      else if (row.estado_datos === 'NO_PROGRAMADO') bucket.noProgramado += 1;
      else if (row.estado_datos === 'NO_VIGENTE') bucket.noVigente += 1;
      factorStates.set(row.tipo_control, bucket);
    }

    const factorData: unknown[][] = [
      [
        'Factor',
        'Dentro de meta',
        'Fuera de meta',
        'Pendiente',
        'Meta incompleta',
        'Sin meta',
        'No programado',
        'No vigente'
      ]
    ];
    const factorNames = [
      ...FACTOR_ORDER.filter((factor) => factorStates.has(factor)),
      ...Array.from(factorStates.keys()).filter((factor) => !FACTOR_ORDER.includes(factor))
    ];
    for (const factor of factorNames) {
      const bucket = factorStates.get(factor)!;
      factorData.push([
        factor,
        bucket.dentroMeta,
        bucket.fueraMeta,
        bucket.pendiente,
        bucket.metaIncompleta,
        bucket.sinMeta,
        bucket.noProgramado,
        bucket.noVigente
      ]);
    }

    const monthly = aggregateBy(fcmAll, (row) => row.periodo, 'FCM');
    const lineData: unknown[][] = [['Mes', 'FCM', 'Meta']];
    for (const period of Array.from(monthly.keys()).sort()) {
      const percentage = monthly.get(period)!.percentage;
      lineData.push([monthLabel(period), percentage, percentage == null ? null : 100]);
    }

    const originCounts = new Map<string, number>();
    for (const row of controls) {
      originCounts.set(row.origen_resultado, (originCounts.get(row.origen_resultado) ?? 0) + 1);
    }
    const originData: unknown[][] = [['Origen', 'Registros']];
    for (const [origin, count] of originCounts) {
      originData.push([labelFrom(ORIGIN_LABELS, origin), count]);
    }

    const charts: ChartSpec[] = [
      {
        id: 'factores-estado',
        title: 'Estado por factor cardiometabólico',
        type: 'ColumnChart',
        data: factorData,
        options: {
          isStacked: true,
          colors: [
            '#10B981',
            '#EF4444',
            '#94A3B8',
            '#94A3B8',
            '#CBD5E1',
            '#E2E8F0',
            '#94A3B8'
          ],
          legend: { position: 'top', textStyle: { fontSize: 9 } },
          chartArea: { left: 48, top: 36, width: '84%', height: '66%' }
        }
      },
      {
        id: 'fcm-mensual',
        title: 'Evolución mensual de FCM',
        type: 'LineChart',
        data: lineData,
        options: {
          colors: [PALETTE[0], PALETTE[4]],
          legend: { position: 'top' },
          chartArea: { left: 52, top: 32, width: '84%', height: '68%' },
          vAxis: { title: '%', viewWindow: { min: 0 } }
        }
      },
      {
        id: 'origen-resultados',
        title: 'Origen de resultados',
        type: 'PieChart',
        data: originData,
        options: {
          pieHole: 0.55,
          colors: PALETTE,
          legend: { position: 'right' }
        }
      }
    ];

    const tables: TableSpec[] = [
      this.fcmParticipantTable(fcmFiltered),
      this.factorDetailTable(controls)
    ];

    return this.baseResponse(
      'cardiometabolicos',
      meta,
      filters,
      narrative,
      kpis,
      charts,
      tables
    );
  }

  private async buildPendientes(filters: Filters, meta: MetaInfo): Promise<DashboardResponse> {
    let weekly = await this.repository.getWeeklyRows(filters);
    let controls = await this.repository.getControlRows(filters);

    if (filters.pendingIndicator.length > 0) {
      const habits = filters.pendingIndicator.filter((value) => value === 'CAF' || value === 'CCS');
      weekly = weekly.filter((row) => habits.includes(row.codigo_indicador));
      if (!filters.pendingIndicator.includes('FCM')) controls = [];
    }

    if (filters.controlType.length > 0) {
      controls = controls.filter((row) => filters.controlType.includes(row.tipo_control));
    }
    if (filters.pendingReason.length > 0) {
      weekly = weekly.filter((row) => filters.pendingReason.includes(row.estado_datos));
      controls = controls.filter((row) => filters.pendingReason.includes(row.estado_datos));
    }
    if (filters.dataState.length > 0) {
      weekly = weekly.filter((row) => filters.dataState.includes(row.estado_datos));
      controls = controls.filter((row) => filters.dataState.includes(row.estado_datos));
    }
    if (filters.periodSituation.length > 0) {
      controls = controls.filter((row) =>
        filters.periodSituation.includes(this.controlSituation(row))
      );
    }

    const habitPending = countWhere(weekly, (row) => row.estado_datos === 'PENDIENTE');
    const habitNoMeta = countWhere(weekly, (row) => row.estado_datos === 'SIN_META');
    const closedControlPending = countWhere(
      controls,
      (row) =>
        ['PENDIENTE', 'META_INCOMPLETA'].includes(row.estado_datos) &&
        this.controlSituation(row) === 'PERIODO_CERRADO'
    );
    const openControlPending = countWhere(
      controls,
      (row) =>
        ['PENDIENTE', 'META_INCOMPLETA'].includes(row.estado_datos) &&
        this.controlSituation(row) === 'PERIODO_EN_CURSO'
    );

    type DistrictBucket = {
      cerrados: number;
      curso: number;
      sinMeta: number;
      noProgramado: number;
      noVigente: number;
    };
    const districtBuckets = new Map<string, DistrictBucket>();
    const bucketFor = (district: string): DistrictBucket => {
      const current =
        districtBuckets.get(district) ??
        { cerrados: 0, curso: 0, sinMeta: 0, noProgramado: 0, noVigente: 0 };
      districtBuckets.set(district, current);
      return current;
    };

    for (const row of weekly) {
      const bucket = bucketFor(row.distrito);
      if (row.estado_datos === 'PENDIENTE') {
        if (Number(row.periodo_cerrado) === 1) bucket.cerrados += 1;
        else bucket.curso += 1;
      } else if (row.estado_datos === 'SIN_META') bucket.sinMeta += 1;
      else if (row.estado_datos === 'NO_PROGRAMADO') bucket.noProgramado += 1;
      else if (row.estado_datos === 'NO_VIGENTE') bucket.noVigente += 1;
    }
    for (const row of controls) {
      const bucket = bucketFor(row.distrito);
      if (['PENDIENTE', 'META_INCOMPLETA'].includes(row.estado_datos)) {
        if (this.controlSituation(row) === 'PERIODO_CERRADO') bucket.cerrados += 1;
        else bucket.curso += 1;
      } else if (row.estado_datos === 'SIN_META') bucket.sinMeta += 1;
      else if (row.estado_datos === 'NO_PROGRAMADO') bucket.noProgramado += 1;
      else if (row.estado_datos === 'NO_VIGENTE') bucket.noVigente += 1;
    }

    const districtTotals = Array.from(districtBuckets.entries()).map(
      ([district, bucket]) => ({
        district,
        bucket,
        total:
          bucket.cerrados +
          bucket.curso +
          bucket.sinMeta +
          bucket.noProgramado +
          bucket.noVigente
      })
    );
    districtTotals.sort(
      (a, b) => b.total - a.total || a.district.localeCompare(b.district, 'es')
    );

    let worstDistrict: { name: string; count: number } | null = null;
    for (const entry of districtTotals) {
      const count = entry.bucket.cerrados + entry.bucket.curso;
      if (count > 0 && (worstDistrict == null || count > worstDistrict.count)) {
        worstDistrict = { name: entry.district, count };
      }
    }

    const kpis: Kpi[] = [
      makeKpi('habitos-pendientes', 'Hábitos pendientes', habitPending, 'integer', 'DATOS_PENDIENTES', 'Registros semanales de hábitos con estado PENDIENTE.'),
      makeKpi('habitos-sin-meta', 'Hábitos sin meta', habitNoMeta, 'integer', 'SIN_META', 'Registros semanales sin meta asignada.'),
      makeKpi('controles-cerrados', 'Controles pendientes cerrados', closedControlPending, 'integer', 'DATOS_PENDIENTES', 'Controles PENDIENTE o META_INCOMPLETA con fin de periodo anterior a la fecha de corte.'),
      makeKpi('controles-curso', 'Pendientes en curso', openControlPending, 'integer', 'NEUTRO', 'Controles PENDIENTE o META_INCOMPLETA de periodos aún abiertos.')
    ];

    const narrative =
      `${closedControlPending} controles pendientes de periodos cerrados. ` +
      (worstDistrict
        ? `El distrito con más pendientes es ${worstDistrict.name} (${worstDistrict.count}).`
        : 'No hay distritos con pendientes.');

    const districtData: unknown[][] = [
      ['Distrito', 'Cerrados', 'En curso', 'Sin meta', 'No programado', 'No vigente']
    ];
    for (const { district, bucket } of districtTotals) {
      districtData.push([
        district,
        bucket.cerrados,
        bucket.curso,
        bucket.sinMeta,
        bucket.noProgramado,
        bucket.noVigente
      ]);
    }

    const reasonCounts = new Map<string, number>();
    for (const row of [...weekly, ...controls]) {
      if (
        ['PENDIENTE', 'META_INCOMPLETA', 'NO_PROGRAMADO', 'SIN_META', 'NO_VIGENTE'].includes(
          row.estado_datos
        )
      ) {
        reasonCounts.set(row.estado_datos, (reasonCounts.get(row.estado_datos) ?? 0) + 1);
      }
    }
    const reasonData: unknown[][] = [['Motivo', 'Registros']];
    for (const reason of REASON_ORDER) {
      const count = reasonCounts.get(reason);
      if (count) reasonData.push([labelFrom(REASON_LABELS, reason), count]);
    }

    const charts: ChartSpec[] = [
      {
        id: 'pendientes-distrito',
        title: 'Pendientes por distrito · cerrados y en curso',
        type: 'BarChart',
        data: districtData,
        options: {
          isStacked: true,
          colors: ['#F59E0B', '#028090', '#CBD5E1', '#E2E8F0', '#94A3B8'],
          legend: { position: 'top', textStyle: { fontSize: 9 } },
          chartArea: { left: 128, top: 30, width: '64%', height: '64%' },
          hAxis: { title: 'Registros', viewWindow: { min: 0 } },
          vAxis: { textStyle: { fontSize: 9 } }
        },
        note: 'No programados, sin meta y no vigentes se muestran separados de los pendientes.'
      },
      {
        id: 'motivos',
        title: 'Motivos de pendiente',
        type: 'PieChart',
        data: reasonData,
        options: {
          pieHole: 0.55,
          colors: PALETTE,
          legend: { position: 'right', textStyle: { fontSize: 9 } },
          chartArea: { left: 8, top: 8, width: '68%', height: '86%' }
        }
      }
    ];

    const mapTable: TableSpec = {
      id: 'mapa-pendientes',
      title: 'Pendientes por distrito (detalle del mapa)',
      note: 'Sustituye al mapa mientras no haya clave de Google Maps.',
      columns: [
        { key: 'distrito', label: 'Distrito' },
        { key: 'cerrados', label: 'Cerrados', type: 'number' },
        { key: 'curso', label: 'En curso', type: 'number' },
        { key: 'total', label: 'Total', type: 'number' }
      ],
      rows: districtTotals.map(({ district, bucket, total }) => ({
        distrito: district,
        cerrados: bucket.cerrados,
        curso: bucket.curso,
        total
      }))
    };

    const tables: TableSpec[] = [
      mapTable,
      this.pendingHabitsTable(weekly),
      this.pendingControlsTable(controls)
    ];

    return this.baseResponse('pendientes', meta, filters, narrative, kpis, charts, tables);
  }

  private async buildEvolucion(filters: Filters, meta: MetaInfo): Promise<DashboardResponse> {
    const indicator = filters.evolutionIndicator ?? filters.indicator ?? 'CAF';
    const periodLabel = (period: string): string =>
      indicator === 'FCM' ? monthLabel(period) : formatWeekLabel(period);
    const chartPeriodLabel = (period: string): string =>
      indicator === 'FCM' ? monthLabel(period) : shortDate(period);
    const from = filters.from ?? (meta.lastClosedMonth ? addMonths(meta.lastClosedMonth, -5) : null);
    const to = filters.to ?? meta.lastClosedMonth;
    const baseFilters: Filters = {
      ...filters,
      years: [],
      months: [],
      weeks: [],
      onlyClosed: true
    };

    let rows: Array<WeeklyRow | FcmRow>;
    if (indicator === 'FCM') {
      const monthly = await this.repository.getFcmRows(baseFilters);
      rows = monthly.filter(
        (row) =>
          (from == null || row.periodo >= startOfMonth(from)) &&
          (to == null || row.periodo <= startOfMonth(to))
      );
    } else {
      const weekly = (await this.repository.getWeeklyRows(baseFilters)).filter(
        (row) => row.codigo_indicador === indicator
      );
      rows = weekly.filter(
        (row) => (from == null || row.periodo >= from) && (to == null || row.periodo <= to)
      );
    }

    const byPeriod = aggregateBy(rows, (row) => row.periodo, indicator);
    const periods = Array.from(byPeriod.keys()).sort();
    const currentPeriod = periods.length > 0 ? periods[periods.length - 1] : null;
    const previousPeriod = periods.length > 1 ? periods[periods.length - 2] : null;
    const current = currentPeriod ? byPeriod.get(currentPeriod)! : null;
    const previous = previousPeriod ? byPeriod.get(previousPeriod)! : null;
    const difference =
      current?.percentage != null && previous?.percentage != null
        ? round(current.percentage - previous.percentage, 2)
        : null;

    const kpis: Kpi[] = [
      makeKpi(
        'actual',
        'Valor actual',
        current?.percentage ?? null,
        'percent',
        current?.state ?? 'SIN_DATOS',
        'Porcentaje agregado del último periodo cerrado del rango.'
      ),
      makeKpi(
        'anterior',
        'Valor anterior',
        previous?.percentage ?? null,
        'percent',
        previous?.state ?? 'SIN_DATOS',
        'Porcentaje agregado del periodo cerrado inmediatamente anterior.'
      ),
      makeKpi(
        'diferencia',
        'Diferencia',
        difference,
        'pp',
        difference == null ? 'SIN_DATOS' : difference > 0 ? 'BUENO' : difference < 0 ? 'MALO' : 'NEUTRO',
        'Diferencia en puntos porcentuales entre el periodo actual y el anterior.'
      )
    ];

    const narrative =
      currentPeriod && previousPeriod
        ? `${INDICATOR_LABELS[indicator]}: ${formatPercent(current?.percentage ?? null)} en ` +
          `${periodLabel(currentPeriod)} frente a ${formatPercent(previous?.percentage ?? null)} en ` +
          `${periodLabel(previousPeriod)} (${difference == null ? 'sin comparación' : `${difference > 0 ? '+' : ''}${formatNumber(difference, 1)} pp`}).`
        : 'Se necesitan al menos dos periodos cerrados con datos para comparar.';

    const trendData: unknown[][] = [['Periodo', indicator, 'Meta']];
    for (const period of periods) {
      const percentage = byPeriod.get(period)!.percentage;
      trendData.push([
        chartPeriodLabel(period),
        percentage,
        percentage == null ? null : 100
      ]);
    }

    const currentRows = currentPeriod ? rows.filter((row) => row.periodo === currentPeriod) : [];
    const compareKey = (row: WeeklyRow | FcmRow): string => {
      if (filters.compareBy === 'sexo') {
        return row.sexo === 'M' ? 'Masculino' : 'Femenino';
      }
      if (filters.compareBy === 'edad') return row.grupo_edad;
      return row.distrito;
    };
    const segmentLabel =
      filters.compareBy === 'sexo'
        ? 'Sexo'
        : filters.compareBy === 'edad'
          ? 'Grupo de edad'
          : 'Distrito';
    const segmentAgg = aggregateBy(currentRows, compareKey, indicator);
    const segmentData: unknown[][] = [['Segmento', indicator]];
    for (const [segment, result] of Array.from(segmentAgg.entries()).sort(
      (a, b) => (b[1].percentage ?? 0) - (a[1].percentage ?? 0)
    )) {
      segmentData.push([segment, result.percentage]);
    }

    const currentByDistrict = aggregateBy(currentRows, (row) => row.distrito, indicator);
    const currentPendingByDistrict = new Map<string, number>();
    for (const row of currentRows) {
      if (['PENDIENTE', 'META_INCOMPLETA'].includes(row.estado_datos)) {
        currentPendingByDistrict.set(
          row.distrito,
          (currentPendingByDistrict.get(row.distrito) ?? 0) + 1
        );
      }
    }
    const mapRows = Array.from(currentByDistrict.entries())
      .sort((a, b) => (b[1].percentage ?? -1) - (a[1].percentage ?? -1))
      .map(([distrito, result]) => ({
        distrito,
        porcentaje: result.percentage,
        estado: result.state,
        evaluables: result.evaluables,
        pendientes: currentPendingByDistrict.get(distrito) ?? 0
      }));

    const charts: ChartSpec[] = [
      {
        id: 'tendencia',
        title: `${INDICATOR_LABELS[indicator]} con meta 100 %`,
        type: 'LineChart',
        data: trendData,
        options: {
          colors: [PALETTE[0], PALETTE[4]],
          legend: { position: 'top' },
          chartArea: { left: 52, top: 32, width: '84%', height: '68%' },
          vAxis: { title: '%', viewWindow: { min: 0 } }
        }
      },
      {
        id: 'comparacion',
        title: `Comparación de segmentos · ${segmentLabel}`,
        type: 'ColumnChart',
        data: segmentData,
        options: {
          colors: [PALETTE[1]],
          legend: { position: 'none' },
          chartArea: { left: 48, top: 8, width: '82%', height: '72%' },
          vAxis: { title: '%', viewWindow: { min: 0 } }
        }
      }
    ];

    const tableRows: Record<string, unknown>[] = [];
    for (const period of periods) {
      const periodRows = rows.filter((row) => row.periodo === period);
      const groups = aggregateBy(periodRows, compareKey, indicator);
      for (const [segment, result] of groups) {
        tableRows.push({
          periodo: periodLabel(period),
          segmento: segment,
          porcentaje: result.percentage,
          evaluables: result.evaluables,
          pendientes: countWhere(
            periodRows.filter((row) => compareKey(row) === segment),
            (row) => row.estado_datos === 'PENDIENTE'
          )
        });
      }
    }

    const tables: TableSpec[] = [
      {
        id: 'mapa-evolucion',
        title: `Resultado por distrito · ${
          currentPeriod ? periodLabel(currentPeriod) : 'último periodo'
        }`,
        note: 'Sustituye al mapa mientras no haya clave de Google Maps.',
        columns: [
          { key: 'distrito', label: 'Distrito' },
          { key: 'porcentaje', label: indicator, type: 'percent' },
          { key: 'estado', label: 'Estado', type: 'state' },
          { key: 'evaluables', label: 'Evaluables', type: 'number' },
          { key: 'pendientes', label: 'Pendientes', type: 'number' }
        ],
        rows: mapRows
      },
      {
        id: 'evolucion-detalle',
        title: 'Periodo, segmento y porcentaje',
        columns: [
          { key: 'periodo', label: 'Periodo' },
          { key: 'segmento', label: segmentLabel },
          { key: 'porcentaje', label: indicator, type: 'percent' },
          { key: 'evaluables', label: 'Evaluables', type: 'number' },
          { key: 'pendientes', label: 'Pendientes', type: 'number' }
        ],
        rows: tableRows
      }
    ];

    return this.baseResponse('evolucion', meta, filters, narrative, kpis, charts, tables);
  }

  private applyWeeklyViewFilters(rows: WeeklyRow[], filters: Filters): WeeklyRow[] {
    let result = rows;
    if (filters.cafState.length > 0 || filters.ccsState.length > 0) {
      result = result.filter((row) => {
        const states = row.codigo_indicador === 'CAF' ? filters.cafState : filters.ccsState;
        return states.length === 0 || states.includes(row.estado_indicador);
      });
    }
    if (filters.dataState.length > 0) {
      result = result.filter((row) => filters.dataState.includes(row.estado_datos));
    }
    if (filters.metaOrigin.length > 0) {
      result = result.filter(
        (row) => row.origen_meta != null && filters.metaOrigin.includes(row.origen_meta)
      );
    }
    return result;
  }

  private controlSituation(row: ControlRow): 'PERIODO_CERRADO' | 'PERIODO_EN_CURSO' | 'NO_APLICA' {
    if (row.estado_datos === 'PENDIENTE' || row.estado_datos === 'META_INCOMPLETA') {
      return row.fin_periodo < row.fecha_corte ? 'PERIODO_CERRADO' : 'PERIODO_EN_CURSO';
    }
    return 'NO_APLICA';
  }

  private mapFallbackChart(
    id: string,
    indicator: IndicatorCode,
    weekly: WeeklyRow[],
    fcm: FcmRow[]
  ): ChartSpec {
    const rows: Array<WeeklyRow | FcmRow> =
      indicator === 'FCM'
        ? fcm
        : weekly.filter((row) => row.codigo_indicador === indicator);
    const byDistrict = aggregateBy(rows, (row) => row.distrito, indicator);
    const data: unknown[][] = [['Address', indicator]];
    for (const [district, result] of Array.from(byDistrict.entries()).sort(
      (a, b) => (b[1].percentage ?? -1) - (a[1].percentage ?? -1)
    )) {
      data.push([district, result.percentage]);
    }
    return {
      id,
      title: `Distrito · ${INDICATOR_LABELS[indicator]}`,
      type: 'Map',
      data,
      options: {
        showTooltip: true,
        showInfoWindow: true,
        useMapTypeControl: true,
        maps: { showInfoWindow: true }
      },
      note: 'Ubicación por distrito; requiere VITE_GOOGLE_MAPS_API_KEY.'
    };
  }

  private districtTable(weekly: WeeklyRow[], fcm: FcmRow[]): TableSpec {
    const districts = new Set<string>([
      ...weekly.map((row) => row.distrito),
      ...fcm.map((row) => row.distrito)
    ]);
    const cafByDistrict = aggregateBy(
      weekly.filter((row) => row.codigo_indicador === 'CAF'),
      (row) => row.distrito,
      'CAF'
    );
    const ccsByDistrict = aggregateBy(
      weekly.filter((row) => row.codigo_indicador === 'CCS'),
      (row) => row.distrito,
      'CCS'
    );
    const fcmByDistrict = aggregateBy(fcm, (row) => row.distrito, 'FCM');
    const participants = new Map<string, Set<number>>();
    for (const row of [...weekly, ...fcm]) {
      const set = participants.get(row.distrito) ?? new Set<number>();
      set.add(row.key_persona);
      participants.set(row.distrito, set);
    }

    const rows = Array.from(districts)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((district) => ({
        distrito: district,
        caf: cafByDistrict.get(district)?.percentage ?? null,
        cafEstado: cafByDistrict.get(district)?.state ?? 'SIN_DATOS',
        ccs: ccsByDistrict.get(district)?.percentage ?? null,
        ccsEstado: ccsByDistrict.get(district)?.state ?? 'SIN_DATOS',
        fcm: fcmByDistrict.get(district)?.percentage ?? null,
        fcmEstado: fcmByDistrict.get(district)?.state ?? 'SIN_DATOS',
        participantes: participants.get(district)?.size ?? 0
      }));

    return {
      id: 'resumen-distrito',
      title: 'Resumen por distrito',
      columns: [
        { key: 'distrito', label: 'Distrito' },
        { key: 'caf', label: 'CAF', type: 'percent' },
        { key: 'cafEstado', label: 'Estado CAF', type: 'state' },
        { key: 'ccs', label: 'CCS', type: 'percent' },
        { key: 'ccsEstado', label: 'Estado CCS', type: 'state' },
        { key: 'fcm', label: 'FCM', type: 'percent' },
        { key: 'fcmEstado', label: 'Estado FCM', type: 'state' },
        { key: 'participantes', label: 'Participantes', type: 'number' }
      ],
      rows
    };
  }

  private participantTable(weekly: WeeklyRow[], fcm: FcmRow[]): TableSpec {
    const keys = new Set<number>([
      ...weekly.map((row) => row.key_persona),
      ...fcm.map((row) => row.key_persona)
    ]);
    const districtOf = new Map<number, string>();
    for (const row of [...weekly, ...fcm]) {
      if (!districtOf.has(row.key_persona)) districtOf.set(row.key_persona, row.distrito);
    }
    const cafByPerson = aggregateBy(
      weekly.filter((row) => row.codigo_indicador === 'CAF'),
      (row) => String(row.key_persona),
      'CAF'
    );
    const ccsByPerson = aggregateBy(
      weekly.filter((row) => row.codigo_indicador === 'CCS'),
      (row) => String(row.key_persona),
      'CCS'
    );
    const fcmByPerson = aggregateBy(fcm, (row) => String(row.key_persona), 'FCM');

    const measures = new Map<
      number,
      { m1: number; m2: number; m3: number; m4: number; m5: number; m6: number }
    >();
    const bucketFor = (key: number) => {
      const current = measures.get(key) ?? { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };
      measures.set(key, current);
      return current;
    };
    for (const row of weekly) {
      const bucket = bucketFor(row.key_persona);
      if (row.codigo_indicador === 'CAF') {
        bucket.m1 += Number(row.minutos_realizados ?? 0);
        bucket.m2 += Number(row.meta_minutos_semanal ?? 0);
      } else {
        bucket.m3 += Number(row.dias_con_contacto ?? 0);
        bucket.m4 += Number(row.meta_dias_semanal ?? 0);
      }
    }
    for (const row of fcm) {
      const bucket = bucketFor(row.key_persona);
      bucket.m5 += Number(row.numerador ?? 0);
      bucket.m6 += Number(row.denominador ?? 0);
    }

    const rows = Array.from(keys)
      .sort((a, b) => a - b)
      .map((key) => {
        const id = String(key);
        const measure = measures.get(key);
        return {
          participante: key,
          distrito: districtOf.get(key) ?? '',
          m1: round(measure?.m1 ?? 0, 0),
          m2: round(measure?.m2 ?? 0, 0),
          m3: round(measure?.m3 ?? 0, 0),
          m4: round(measure?.m4 ?? 0, 0),
          m5: round(measure?.m5 ?? 0, 0),
          m6: round(measure?.m6 ?? 0, 0),
          caf: cafByPerson.get(id)?.percentage ?? null,
          cafEstado: cafByPerson.get(id)?.state ?? 'SIN_DATOS',
          ccs: ccsByPerson.get(id)?.percentage ?? null,
          ccsEstado: ccsByPerson.get(id)?.state ?? 'SIN_DATOS',
          fcm: fcmByPerson.get(id)?.percentage ?? null,
          fcmEstado: fcmByPerson.get(id)?.state ?? 'SIN_DATOS'
        };
      });

    return {
      id: 'seguimiento-participante',
      title: 'Seguimiento por participante',
      note: 'M1–M4 suman hábitos semanales; M5–M6 suman factores mensuales.',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'distrito', label: 'Distrito' },
        { key: 'm1', label: 'M1', type: 'number' },
        { key: 'm2', label: 'M2', type: 'number' },
        { key: 'm3', label: 'M3', type: 'number' },
        { key: 'm4', label: 'M4', type: 'number' },
        { key: 'm5', label: 'M5', type: 'number' },
        { key: 'm6', label: 'M6', type: 'number' },
        { key: 'caf', label: 'CAF', type: 'percent' },
        { key: 'cafEstado', label: 'Estado CAF', type: 'state' },
        { key: 'ccs', label: 'CCS', type: 'percent' },
        { key: 'ccsEstado', label: 'Estado CCS', type: 'state' },
        { key: 'fcm', label: 'FCM', type: 'percent' },
        { key: 'fcmEstado', label: 'Estado FCM', type: 'state' }
      ],
      rows
    };
  }

  private controlsTable(controls: ControlRow[]): TableSpec {
    const rows = [...controls]
      .sort((a, b) => (a.periodo === b.periodo ? a.key_persona - b.key_persona : b.periodo.localeCompare(a.periodo)))
      .map((row) => ({
        participante: row.key_persona,
        periodo: monthLabel(row.periodo),
        tipo: row.tipo_control,
        m5: row.factores_dentro_meta,
        m6: row.factores_previstos,
        estado: row.estado_datos,
        origen: labelFrom(ORIGIN_LABELS, row.origen_resultado),
        validacion: labelFrom(VALIDATION_LABELS, row.estado_validacion)
      }));

    return {
      id: 'detalle-controles',
      title: 'Detalle de controles del periodo',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'periodo', label: 'Periodo' },
        { key: 'tipo', label: 'Tipo de control' },
        { key: 'm5', label: 'M5', type: 'number' },
        { key: 'm6', label: 'M6', type: 'number' },
        { key: 'estado', label: 'Estado', type: 'state' },
        { key: 'origen', label: 'Origen' },
        { key: 'validacion', label: 'Validación' }
      ],
      rows
    };
  }

  private fcmParticipantTable(rows: FcmRow[]): TableSpec {
    return {
      id: 'fcm-participante',
      title: 'FCM por participante y mes',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'periodo', label: 'Periodo' },
        { key: 'm5', label: 'M5', type: 'number' },
        { key: 'm6', label: 'M6', type: 'number' },
        { key: 'porcentaje', label: 'FCM', type: 'percent' },
        { key: 'estado', label: 'Estado', type: 'state' },
        { key: 'pendientes', label: 'Factores pendientes', type: 'number' }
      ],
      rows: [...rows]
        .sort((a, b) => (a.periodo === b.periodo ? a.key_persona - b.key_persona : b.periodo.localeCompare(a.periodo)))
        .map((row) => ({
          participante: row.key_persona,
          periodo: monthLabel(row.periodo),
          m5: row.numerador,
          m6: row.denominador,
          porcentaje: row.porcentaje,
          estado: row.estado_indicador,
          pendientes: row.factores_pendientes
        }))
    };
  }

  private factorDetailTable(controls: ControlRow[]): TableSpec {
    return {
      id: 'detalle-factor',
      title: 'Detalle por factor',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'periodo', label: 'Periodo' },
        { key: 'factor', label: 'Factor' },
        { key: 'm5', label: 'M5', type: 'number' },
        { key: 'm6', label: 'M6', type: 'number' },
        { key: 'estado', label: 'Estado', type: 'state' },
        { key: 'origen', label: 'Origen' },
        { key: 'validacion', label: 'Validación' }
      ],
      rows: [...controls]
        .sort((a, b) => (a.periodo === b.periodo ? a.key_persona - b.key_persona : b.periodo.localeCompare(a.periodo)))
        .map((row) => ({
          participante: row.key_persona,
          periodo: monthLabel(row.periodo),
          factor: row.tipo_control,
          m5: row.factores_dentro_meta,
          m6: row.factores_previstos,
          estado: row.estado_datos,
          origen: labelFrom(ORIGIN_LABELS, row.origen_resultado),
          validacion: labelFrom(VALIDATION_LABELS, row.estado_validacion)
        }))
    };
  }

  private pendingHabitsTable(rows: WeeklyRow[]): TableSpec {
    const data = [...rows]
      .filter((row) =>
        ['PENDIENTE', 'SIN_META', 'NO_PROGRAMADO', 'NO_VIGENTE'].includes(row.estado_datos)
      )
      .map((row) => ({
        participante: row.key_persona,
        semana: formatWeekLabel(row.periodo),
        indicador: row.codigo_indicador,
        estado: row.estado_indicador,
        estado_datos: row.estado_datos,
        situacion:
          row.estado_datos === 'PENDIENTE'
            ? row.fin_periodo < row.fecha_corte
              ? 'PERIODO_CERRADO'
              : 'PERIODO_EN_CURSO'
            : 'NO_APLICA'
      }))
      .sort((a, b) => {
        const aClosed = a.situacion === 'PERIODO_CERRADO' ? 0 : 1;
        const bClosed = b.situacion === 'PERIODO_CERRADO' ? 0 : 1;
        if (aClosed !== bClosed) return aClosed - bClosed;
        return a.participante - b.participante;
      });

    return {
      id: 'habitos-pendientes',
      title: 'Hábitos pendientes y sin meta',
      note: 'Los periodos cerrados aparecen primero y resaltados.',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'semana', label: 'Semana' },
        { key: 'indicador', label: 'Indicador' },
        { key: 'estado', label: 'Estado', type: 'state' },
        { key: 'estado_datos', label: 'Estado de datos', type: 'state' },
        { key: 'situacion', label: 'Situación del periodo', type: 'state' }
      ],
      rows: data
    };
  }

  private pendingControlsTable(rows: ControlRow[]): TableSpec {
    const stateOrder = ['PENDIENTE', 'META_INCOMPLETA', 'SIN_META', 'NO_PROGRAMADO', 'NO_VIGENTE'];
    const sorted = rows
      .filter((row) => stateOrder.includes(row.estado_datos))
      .sort((a, b) => {
        const aClosed = this.controlSituation(a) === 'PERIODO_CERRADO' ? 0 : 1;
        const bClosed = this.controlSituation(b) === 'PERIODO_CERRADO' ? 0 : 1;
        if (aClosed !== bClosed) return aClosed - bClosed;
        const aState = stateOrder.indexOf(a.estado_datos);
        const bState = stateOrder.indexOf(b.estado_datos);
        if (aState !== bState) return aState - bState;
        if (a.periodo !== b.periodo) return b.periodo.localeCompare(a.periodo);
        return a.key_persona - b.key_persona;
      });

    return {
      id: 'controles-pendientes',
      title: 'Controles pendientes, sin meta y no programados',
      note: 'Los periodos cerrados aparecen primero y resaltados.',
      columns: [
        { key: 'participante', label: 'Participante', type: 'participant' },
        { key: 'periodo', label: 'Periodo' },
        { key: 'factor', label: 'Factor' },
        { key: 'estado', label: 'Estado', type: 'state' },
        { key: 'situacion', label: 'Situación del periodo', type: 'state' },
        { key: 'distrito', label: 'Distrito' }
      ],
      rows: sorted.map((row) => ({
        participante: row.key_persona,
        periodo: monthLabel(row.periodo),
        factor: row.tipo_control,
        estado: row.estado_datos,
        situacion: this.controlSituation(row),
        distrito: row.distrito
      }))
    };
  }
}
