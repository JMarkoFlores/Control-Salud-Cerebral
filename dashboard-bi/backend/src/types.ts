export type ViewId =
  | 'resumen'
  | 'actividad'
  | 'contacto'
  | 'cardiometabolicos'
  | 'pendientes'
  | 'evolucion';

export type IndicatorCode = 'CAF' | 'CCS' | 'FCM';
export type Periodicidad = 'SEMANAL' | 'MENSUAL';

export type IndicatorState =
  | 'OPTIMO'
  | 'BUENO'
  | 'REGULAR'
  | 'MALO'
  | 'DATOS_PENDIENTES'
  | 'SIN_META'
  | 'NO_PROGRAMADO'
  | 'SIN_DATOS';

export interface Filters {
  years: number[];
  months: number[];
  weeks: string[];
  department?: string;
  province?: string;
  districts: string[];
  sexes: string[];
  ageGroups: string[];
  personStates: string[];
  participant?: number;
  onlyClosed: boolean;
  indicator?: IndicatorCode;
  cafState: string[];
  ccsState: string[];
  dataState: string[];
  metaOrigin: string[];
  controlType: string[];
  resultOrigin: string[];
  validation: string[];
  pendingIndicator: string[];
  pendingReason: string[];
  periodSituation: string[];
  evolutionIndicator?: IndicatorCode;
  from?: string;
  to?: string;
  compareBy: 'distrito' | 'edad' | 'sexo';
}

export interface MetaInfo {
  source: 'mock' | 'sqlserver';
  fechaCorte: string | null;
  lastClosedWeek: string | null;
  lastClosedMonth: string | null;
  lastClosedWeekInLastClosedMonth: string | null;
  defaults: {
    years: number[];
    months: number[];
    weeks: string[];
    from?: string;
    to?: string;
  };
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  years: number[];
  months: FilterOption[];
  weeks: FilterOption[];
  departments: string[];
  provinces: string[];
  districts: string[];
  sexes: FilterOption[];
  ageGroups: string[];
  personStates: string[];
  participants: number[];
  indicators: FilterOption[];
  cafStates: FilterOption[];
  ccsStates: FilterOption[];
  dataStates: FilterOption[];
  metaOrigins: string[];
  controlTypes: string[];
  resultOrigins: string[];
  validations: string[];
  pendingReasons: FilterOption[];
  periodSituations: FilterOption[];
  defaults: MetaInfo['defaults'];
}

export interface BaseIndicatorRow {
  key_persona: number;
  sexo: string;
  estado_persona: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  edad: number;
  grupo_edad: string;
  en_rango_edad: number;
  periodo: string;
  fin_periodo: string;
  fecha_corte: string;
  numerador: number | null;
  denominador: number | null;
  porcentaje: number | null;
  estado_datos: string;
  estado_indicador: string;
  es_evaluable: number;
  periodo_cerrado: number;
}

export interface WeeklyRow extends BaseIndicatorRow {
  codigo_indicador: 'CAF' | 'CCS';
  anio: number;
  semana: number;
  tipo_seguimiento: string;
  id_meta: string;
  origen_meta: string | null;
  version_meta: number | null;
  minutos_realizados: number | null;
  meta_minutos_semanal: number | null;
  dias_con_contacto: number | null;
  meta_dias_semanal: number | null;
  unidad_medida: string;
}

export interface FcmRow extends BaseIndicatorRow {
  codigo_indicador: 'FCM';
  anio: number;
  trimestre: number;
  mes: number;
  factores_evaluados: number;
  factores_pendientes: number;
  factores_no_programados: number;
  factores_sin_seguimiento: number;
  unidad_medida: string;
}

export interface ControlRow {
  key_persona: number;
  sexo: string;
  estado_persona: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  edad: number;
  grupo_edad: string;
  en_rango_edad: number;
  periodo: string;
  fin_periodo: string;
  anio: number;
  trimestre: number;
  mes: number;
  id_tipo_seguimiento: string;
  tipo_control: string;
  origen_resultado: string;
  estado_validacion: string;
  resultado_referencia: number | null;
  id_meta: string;
  criterio_meta: string | null;
  unidad: string | null;
  factores_dentro_meta: number;
  factores_previstos: number;
  estado_datos: string;
  fecha_corte: string;
  periodo_cerrado: number;
}

export interface IndicatorRow extends BaseIndicatorRow {
  codigo_indicador: IndicatorCode;
  periodicidad: Periodicidad;
  unidad_medida: string;
}

export type KpiFormat = 'percent' | 'integer' | 'minutes' | 'days' | 'pp';

export interface Kpi {
  id: string;
  label: string;
  value: number | null;
  format: KpiFormat;
  state: IndicatorState | 'NEUTRO';
  numerator?: number | null;
  denominator?: number | null;
  evaluables?: number;
  detail?: string;
  help: string;
}

export type ColumnType = 'text' | 'number' | 'percent' | 'state' | 'date' | 'participant';

export interface TableColumn {
  key: string;
  label: string;
  type?: ColumnType;
}

export interface TableSpec {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  note?: string;
}

export type ChartType =
  | 'ComboChart'
  | 'PieChart'
  | 'BarChart'
  | 'ColumnChart'
  | 'LineChart'
  | 'Map'
  | 'Table';

export interface ChartSpec {
  id: string;
  title: string;
  type: ChartType;
  data: unknown[][];
  options?: Record<string, unknown>;
  note?: string;
}

export interface DashboardResponse {
  view: ViewId;
  source: 'mock' | 'sqlserver';
  fechaCorte: string | null;
  filters: Filters;
  narrative: string;
  kpis: Kpi[];
  tables: TableSpec[];
  charts: ChartSpec[];
  meta: MetaInfo;
}

export interface AggregateResult {
  numerator: number;
  denominator: number;
  evaluables: number;
  percentage: number | null;
  state: IndicatorState;
}

export interface DashboardRepository {
  getMeta(): Promise<MetaInfo>;
  getFilterOptions(filters: Filters): Promise<FilterOptions>;
  getWeeklyRows(filters: Filters): Promise<WeeklyRow[]>;
  getFcmRows(filters: Filters): Promise<FcmRow[]>;
  getControlRows(filters: Filters): Promise<ControlRow[]>;
  getIndicatorRows(filters: Filters): Promise<IndicatorRow[]>;
}
