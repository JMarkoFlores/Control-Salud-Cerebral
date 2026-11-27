import sql from 'mssql';
import {
  ControlRow,
  DashboardRepository,
  FcmRow,
  FilterOption,
  FilterOptions,
  Filters,
  IndicatorRow,
  MetaInfo,
  WeeklyRow
} from '../types';
import { env } from '../config/env';
import { formatMonthLabel, formatWeekLabel, monthOf, yearOf } from '../utils/date';
import { STATE_LABELS } from '../utils/calc';
import { TtlCache } from '../utils/cache';

type Row = Record<string, unknown>;

const DATA_STATE_LABELS: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  EN_CURSO: 'En curso',
  PENDIENTE: 'Pendiente',
  SIN_META: 'Sin meta',
  DENTRO_META: 'Dentro de meta',
  FUERA_META: 'Fuera de meta',
  META_INCOMPLETA: 'Meta incompleta',
  NO_PROGRAMADO: 'No programado',
  NO_VIGENTE: 'No vigente'
};
const PENDING_REASON_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  META_INCOMPLETA: 'Meta incompleta',
  NO_PROGRAMADO: 'No programado',
  SIN_META: 'Sin meta',
  NO_VIGENTE: 'No vigente'
};
const PERIOD_SITUATIONS: FilterOption[] = [
  { value: 'PERIODO_CERRADO', label: 'Periodo cerrado' },
  { value: 'PERIODO_EN_CURSO', label: 'Periodo en curso' },
  { value: 'NO_APLICA', label: 'No aplica' }
];

const NUMERIC_COLUMNS = new Set([
  'key_persona', 'key_ubicacion', 'edad', 'en_rango_edad', 'anio', 'semana',
  'trimestre', 'mes', 'numerador', 'denominador', 'porcentaje', 'es_evaluable',
  'periodo_cerrado', 'version_meta', 'minutos_realizados', 'meta_minutos_semanal',
  'dias_con_contacto', 'meta_dias_semanal', 'factores_evaluados',
  'factores_pendientes', 'factores_no_programados', 'factores_sin_seguimiento',
  'factores_dentro_meta', 'factores_previstos', 'resultado_referencia'
]);

function dateOnly(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return value;
}

function normalizeRow(source: Row): Row {
  const result: Row = {};
  for (const [key, raw] of Object.entries(source)) {
    if (raw == null) {
      result[key] = null;
    } else if (raw instanceof Date) {
      result[key] = dateOnly(raw);
    } else if (NUMERIC_COLUMNS.has(key)) {
      const value = typeof raw === 'boolean' ? Number(raw) : Number(raw);
      result[key] = Number.isFinite(value) ? value : null;
    } else {
      result[key] = raw;
    }
  }
  return result;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function sortText(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, 'es'));
}

function options(values: string[], labels?: Record<string, string>): FilterOption[] {
  return values.map((value) => ({ value, label: labels?.[value] ?? value }));
}

class WhereBuilder {
  private readonly clauses: string[];
  private readonly parameters: Array<{ name: string; value: unknown }> = [];
  private next = 0;

  constructor(fixed: string[] = ["pais = N'Perú'", 'en_rango_edad = 1']) {
    this.clauses = [...fixed];
  }

  private bind(value: unknown): string {
    const name = `p${this.next++}`;
    const boundValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
      : value;
    this.parameters.push({ name, value: boundValue });
    return `@${name}`;
  }

  equals(column: string, value: unknown): void {
    if (value !== undefined && value !== null && value !== '') {
      this.clauses.push(`${column} = ${this.bind(value)}`);
    }
  }

  in(column: string, values: unknown[]): void {
    if (values.length === 0) return;
    this.clauses.push(`${column} IN (${values.map((value) => this.bind(value)).join(', ')})`);
  }

  where(): string {
    return this.clauses.length > 0 ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }

  async run<T extends object>(pool: sql.ConnectionPool, query: string): Promise<T[]> {
    const request = pool.request();
    for (const parameter of this.parameters) {
      request.input(parameter.name, parameter.value as never);
    }
    const result = await request.query(query);
    return (result.recordset as Row[]).map((row) => normalizeRow(row) as T);
  }
}

const WEEKLY_VIEW = '[bi].[v_IndicadoresSemanales]';
const FCM_VIEW = '[bi].[v_IndicadorFCM]';
const CONTROL_VIEW = '[bi].[v_ControlesDetalle]';
const INDICATORS_VIEW = '[bi].[v_Indicadores]';

export class SqlServerRepository implements DashboardRepository {
  private poolPromise: Promise<sql.ConnectionPool> | null = null;
  private readonly metaCache = new TtlCache<MetaInfo>(env.CACHE_TTL_MS, 1);
  private readonly optionsCache = new TtlCache<FilterOptions>(env.CACHE_TTL_MS);

  private getPool(): Promise<sql.ConnectionPool> {
    if (!this.poolPromise) {
      const pool = new sql.ConnectionPool({
        server: env.BI_DB_SERVER!,
        port: env.BI_DB_PORT,
        database: env.BI_DB_DATABASE,
        user: env.BI_DB_USER!,
        password: env.BI_DB_PASSWORD!,
        connectionTimeout: env.QUERY_TIMEOUT_MS,
        requestTimeout: env.QUERY_TIMEOUT_MS,
        pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
        options: {
          encrypt: env.BI_DB_ENCRYPT,
          trustServerCertificate: env.BI_DB_TRUST_SERVER_CERTIFICATE,
          enableArithAbort: true
        }
      });
      this.poolPromise = pool.connect().catch((error: unknown) => {
        this.poolPromise = null;
        throw error;
      });
    }
    return this.poolPromise;
  }

  async close(): Promise<void> {
    if (!this.poolPromise) return;
    const pool = await this.poolPromise.catch(() => null);
    this.poolPromise = null;
    if (pool) await pool.close();
  }

  private async query<T extends object>(view: string, filters: Filters, granularity: 'week' | 'month'):
  Promise<T[]> {
    const pool = await this.getPool();
    const where = new WhereBuilder();
    const prefix = 'v';
    const addIn = (column: string, values: unknown[]) => where.in(`${prefix}.${column}`, values);
    where.equals(`${prefix}.departamento`, filters.department);
    where.equals(`${prefix}.provincia`, filters.province);
    addIn('distrito', filters.districts);
    addIn('sexo', filters.sexes);
    addIn('grupo_edad', filters.ageGroups);
    addIn('estado_persona', filters.personStates);
    where.equals(`${prefix}.key_persona`, filters.participant);
    if (filters.onlyClosed) where.equals(`${prefix}.periodo_cerrado`, 1);
    addIn('anio', filters.years);

    if (granularity === 'week') {
      // v_IndicadoresSemanales no tiene columna `mes`; el mes se obtiene del
      // lunes del periodo (misma regla que usa la vista para asignar semanas).
      if (filters.months.length > 0) where.in('MONTH(v.periodo)', filters.months);
      addIn('periodo', filters.weeks);
    } else {
      if (filters.weeks.length > 0) {
        where.in('CONVERT(char(7), v.periodo, 126)', unique(filters.weeks.map((week) => week.slice(0, 7))));
      } else if (filters.months.length > 0) {
        addIn('mes', filters.months);
      }
    }

    const sqlWhere = where.where();
    const text = `SELECT v.* FROM ${view} AS v ${sqlWhere}`;
    return where.run<T>(pool, text);
  }

  async getMeta(): Promise<MetaInfo> {
    const cached = this.metaCache.get('meta');
    if (cached) return cached;
    const pool = await this.getPool();
    const request = pool.request();
    const result = await request.query(`
      SELECT
        (SELECT MAX(fecha_corte) FROM ${INDICATORS_VIEW} WHERE pais = N'Perú' AND en_rango_edad = 1) AS fechaCorte,
        (SELECT MAX(periodo) FROM ${WEEKLY_VIEW} WHERE pais = N'Perú' AND en_rango_edad = 1 AND periodo_cerrado = 1) AS lastClosedWeek,
        (SELECT MAX(periodo) FROM ${FCM_VIEW} WHERE pais = N'Perú' AND en_rango_edad = 1 AND periodo_cerrado = 1) AS lastClosedMonth`);
    const row = normalizeRow(result.recordset[0] as Row);
    const fechaCorte = (row.fechaCorte as string | null) ?? null;
    const lastClosedWeek = (row.lastClosedWeek as string | null) ?? null;
    const lastClosedMonth = (row.lastClosedMonth as string | null) ?? null;
    let lastClosedWeekInLastClosedMonth: string | null = null;
    if (lastClosedMonth) {
      const weeks = await this.getWeeklyRows({
        years: [yearOf(lastClosedMonth)], months: [monthOf(lastClosedMonth)], weeks: [],
        districts: [], sexes: [], ageGroups: [], personStates: [], onlyClosed: true,
        cafState: [], ccsState: [], dataState: [], metaOrigin: [], controlType: [],
        resultOrigin: [], validation: [], pendingIndicator: [], pendingReason: [],
        periodSituation: [], compareBy: 'distrito'
      });
      lastClosedWeekInLastClosedMonth = weeks.reduce<string | null>(
        (latest, row) => row.periodo > (latest ?? '') ? row.periodo : latest, null
      );
    }
    const meta: MetaInfo = {
      source: 'sqlserver', fechaCorte, lastClosedWeek, lastClosedMonth,
      lastClosedWeekInLastClosedMonth,
      defaults: {
        years: lastClosedWeek ? [yearOf(lastClosedWeek)] : [],
        months: lastClosedWeek ? [monthOf(lastClosedWeek)] : [],
        weeks: lastClosedWeek ? [lastClosedWeek] : [],
        from: lastClosedMonth ?? undefined,
        to: lastClosedMonth ?? undefined
      }
    };
    this.metaCache.set('meta', meta);
    return meta;
  }

  getWeeklyRows(filters: Filters): Promise<WeeklyRow[]> {
    return this.query<WeeklyRow>(WEEKLY_VIEW, filters, 'week');
  }

  getFcmRows(filters: Filters): Promise<FcmRow[]> {
    return this.query<FcmRow>(FCM_VIEW, filters, 'month');
  }

  async getControlRows(filters: Filters): Promise<ControlRow[]> {
    // The real view has no periodo_cerrado column; calculate it from its dates.
    const rows = await this.query<ControlRow>(CONTROL_VIEW, { ...filters, onlyClosed: false }, 'month');
    const withClosedFlag = rows.map((row) => ({
      ...row,
      periodo_cerrado: row.fin_periodo < row.fecha_corte ? 1 : 0
    }));
    return filters.onlyClosed
      ? withClosedFlag.filter((row) => row.periodo_cerrado === 1)
      : withClosedFlag;
  }

  async getIndicatorRows(filters: Filters): Promise<IndicatorRow[]> {
    const [weekly, fcm] = await Promise.all([
      this.getWeeklyRows(filters),
      this.getFcmRows(filters)
    ]);
    return [
      ...weekly.map((row) => ({ ...row, periodicidad: 'SEMANAL' as const } as IndicatorRow)),
      ...fcm.map((row) => ({ ...row, periodicidad: 'MENSUAL' as const } as IndicatorRow))
    ];
  }

  async getFilterOptions(filters: Filters): Promise<FilterOptions> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.optionsCache.get(cacheKey);
    if (cached) return cached;
    const options = await this.loadFilterOptions(filters);
    this.optionsCache.set(cacheKey, options);
    return options;
  }

  private async loadFilterOptions(filters: Filters): Promise<FilterOptions> {
    const [weeklyFiltered, fcmFiltered, controlsFiltered, yearRows, monthRows, weekRows,
      locationRows, provinceRows, districtRows, sexRows, ageRows, stateRows, participantRows] = await Promise.all([
      this.getWeeklyRows(filters), this.getFcmRows(filters), this.getControlRows(filters),
      // Para listar todos los años disponibles no se debe aplicar el año ya seleccionado.
      this.getIndicatorRows({ ...filters, years: [], months: [], weeks: [] }),
      this.getIndicatorRows({ ...filters, months: [], weeks: [] }),
      this.getWeeklyRows({ ...filters, weeks: [] }),
      this.getIndicatorRows({ ...filters, department: undefined, province: undefined, districts: [] }),
      this.getIndicatorRows({ ...filters, province: undefined, districts: [] }),
      this.getIndicatorRows({ ...filters, districts: [] }),
      this.getIndicatorRows({ ...filters, sexes: [] }),
      this.getIndicatorRows({ ...filters, ageGroups: [] }),
      this.getIndicatorRows({ ...filters, personStates: [] }),
      this.getIndicatorRows({ ...filters, participant: undefined })
    ]);
    const allFiltered = [...weeklyFiltered, ...fcmFiltered, ...controlsFiltered];
    const uniqueStrings = (values: Array<string | null | undefined>) => unique(values.filter((v): v is string => !!v));
    const cafStates = uniqueStrings(weeklyFiltered.filter((row) => row.codigo_indicador === 'CAF').map((row) => row.estado_indicador));
    const ccsStates = uniqueStrings(weeklyFiltered.filter((row) => row.codigo_indicador === 'CCS').map((row) => row.estado_indicador));
    const dataStates = uniqueStrings(allFiltered.map((row) => row.estado_datos));
    const pendingReasons = uniqueStrings([
      ...weeklyFiltered.filter((row) => ['PENDIENTE', 'SIN_META'].includes(row.estado_datos)).map((row) => row.estado_datos),
      ...controlsFiltered.filter((row) => ['PENDIENTE', 'META_INCOMPLETA', 'NO_PROGRAMADO', 'SIN_META', 'NO_VIGENTE'].includes(row.estado_datos)).map((row) => row.estado_datos)
    ]);
    const years = unique(yearRows.map((row) => yearOf(row.periodo))).sort((a, b) => b - a);
    const months = unique(monthRows.map((row) => monthOf(row.periodo))).sort((a, b) => a - b);
    const weeks = unique(weekRows.map((row) => row.periodo)).sort();
    const meta = await this.getMeta();
    return {
      years,
      months: months.map((month) => ({ value: String(month), label: formatMonthLabel(month) })),
      weeks: weeks.map((week) => ({ value: week, label: formatWeekLabel(week) })),
      departments: sortText(uniqueStrings(locationRows.map((row) => row.departamento))),
      provinces: sortText(uniqueStrings(provinceRows.map((row) => row.provincia))),
      districts: sortText(uniqueStrings(districtRows.map((row) => row.distrito))),
      sexes: options(sortText(uniqueStrings(sexRows.map((row) => row.sexo))), { M: 'Masculino', F: 'Femenino' }),
      ageGroups: ['30-39', '40-49', '50-59', '60-65'].filter((group) => ageRows.some((row) => row.grupo_edad === group)),
      personStates: sortText(uniqueStrings(stateRows.map((row) => row.estado_persona))),
      participants: unique(participantRows.map((row) => row.key_persona)).sort((a, b) => a - b),
      indicators: [
        { value: 'CAF', label: 'Actividad física' },
        { value: 'CCS', label: 'Contacto social' },
        { value: 'FCM', label: 'Cardiometabólicos' }
      ],
      cafStates: options(sortText(cafStates), STATE_LABELS as Record<string, string>),
      ccsStates: options(sortText(ccsStates), STATE_LABELS as Record<string, string>),
      dataStates: options(sortText(dataStates), DATA_STATE_LABELS),
      metaOrigins: sortText(uniqueStrings(weeklyFiltered.map((row) => row.origen_meta))),
      controlTypes: sortText(uniqueStrings(controlsFiltered.map((row) => row.tipo_control))),
      resultOrigins: sortText(uniqueStrings(controlsFiltered.map((row) => row.origen_resultado))),
      validations: sortText(uniqueStrings(controlsFiltered.map((row) => row.estado_validacion))),
      pendingReasons: options(sortText(pendingReasons), PENDING_REASON_LABELS),
      periodSituations: PERIOD_SITUATIONS,
      defaults: meta.defaults
    };
  }
}
