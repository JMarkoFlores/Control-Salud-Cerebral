export type ViewId =
  | 'resumen'
  | 'actividad'
  | 'contacto'
  | 'cardiometabolicos'
  | 'pendientes'
  | 'evolucion';

export type IndicatorCode = 'CAF' | 'CCS' | 'FCM';

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
