import { Filters, MetaInfo, ViewId } from '../types';
import { addMonths, monthOf, yearOf } from './date';

export const VIEW_IDS: ViewId[] = [
  'resumen',
  'actividad',
  'contacto',
  'cardiometabolicos',
  'pendientes',
  'evolucion'
];

export function isViewId(value: unknown): value is ViewId {
  return typeof value === 'string' && (VIEW_IDS as string[]).includes(value);
}

export function emptyFilters(): Filters {
  return {
    years: [],
    months: [],
    weeks: [],
    districts: [],
    sexes: [],
    ageGroups: [],
    personStates: [],
    onlyClosed: false,
    cafState: [],
    ccsState: [],
    dataState: [],
    metaOrigin: [],
    controlType: [],
    resultOrigin: [],
    validation: [],
    pendingIndicator: [],
    pendingReason: [],
    periodSituation: [],
    compareBy: 'distrito'
  };
}

export function defaultFiltersForView(view: ViewId, meta: MetaInfo): Filters {
  const filters = emptyFilters();
  filters.onlyClosed = view !== 'evolucion';

  const month = meta.lastClosedMonth;
  const week =
    view === 'resumen' || view === 'pendientes'
      ? meta.lastClosedWeekInLastClosedMonth ?? meta.lastClosedWeek
      : meta.lastClosedWeek;

  if (view === 'cardiometabolicos') {
    if (month) {
      filters.years = [yearOf(month)];
      filters.months = [monthOf(month)];
    }
    return filters;
  }

  if (view === 'evolucion') {
    if (month) {
      filters.from = addMonths(month, -5);
      filters.to = month;
    }
    return filters;
  }

  if (week) {
    filters.years = [yearOf(week)];
    filters.months = [monthOf(week)];
    if (view !== 'actividad' && view !== 'contacto') {
      filters.weeks = [week];
    }
  }
  return filters;
}

export interface FilterableRow {
  key_persona: number;
  sexo: string;
  estado_persona: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  grupo_edad: string;
  en_rango_edad: number;
  periodo: string;
  periodo_cerrado: number;
}

function matchesCommon(row: FilterableRow, filters: Filters): boolean {
  if (row.pais !== 'Perú') return false;
  if (Number(row.en_rango_edad) !== 1) return false;

  if (filters.department && row.departamento !== filters.department) return false;
  if (filters.province && row.provincia !== filters.province) return false;
  if (filters.districts.length > 0 && !filters.districts.includes(row.distrito)) return false;
  if (filters.sexes.length > 0 && !filters.sexes.includes(row.sexo)) return false;
  if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(row.grupo_edad)) return false;
  if (
    filters.personStates.length > 0 &&
    !filters.personStates.includes(row.estado_persona)
  ) {
    return false;
  }
  if (filters.participant != null && row.key_persona !== filters.participant) return false;
  if (filters.onlyClosed && Number(row.periodo_cerrado) !== 1) return false;
  return true;
}

/**
 * Las semanas se asignan al año y mes de su lunes. Para filas mensuales,
 * el filtro de semana se traduce al mes de ese lunes (nunca se unen hechos).
 */
export function matchesFilters(
  row: FilterableRow,
  filters: Filters,
  granularity: 'week' | 'month'
): boolean {
  if (!matchesCommon(row, filters)) return false;

  if (filters.years.length > 0 && !filters.years.includes(yearOf(row.periodo))) {
    return false;
  }

  if (granularity === 'week') {
    if (filters.months.length > 0 && !filters.months.includes(monthOf(row.periodo))) {
      return false;
    }
    if (filters.weeks.length > 0 && !filters.weeks.includes(row.periodo)) {
      return false;
    }
  } else {
    if (filters.weeks.length > 0) {
      const allowedMonths = new Set(filters.weeks.map((week) => week.slice(0, 7)));
      if (!allowedMonths.has(row.periodo.slice(0, 7))) return false;
    } else if (
      filters.months.length > 0 &&
      !filters.months.includes(monthOf(row.periodo))
    ) {
      return false;
    }
  }

  return true;
}

export function applyFilters<T extends FilterableRow>(
  rows: T[],
  filters: Filters,
  granularity: 'week' | 'month'
): T[] {
  return rows.filter((row) => matchesFilters(row, filters, granularity));
}

export function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.years.length > 0) count += 1;
  if (filters.months.length > 0) count += 1;
  if (filters.weeks.length > 0) count += 1;
  if (filters.department) count += 1;
  if (filters.province) count += 1;
  if (filters.districts.length > 0) count += 1;
  if (filters.sexes.length > 0) count += 1;
  if (filters.ageGroups.length > 0) count += 1;
  if (filters.personStates.length > 0) count += 1;
  if (filters.participant != null) count += 1;
  if (filters.onlyClosed) count += 1;
  if (filters.indicator) count += 1;
  if (filters.cafState.length > 0) count += 1;
  if (filters.ccsState.length > 0) count += 1;
  if (filters.dataState.length > 0) count += 1;
  if (filters.metaOrigin.length > 0) count += 1;
  if (filters.controlType.length > 0) count += 1;
  if (filters.resultOrigin.length > 0) count += 1;
  if (filters.validation.length > 0) count += 1;
  if (filters.pendingIndicator.length > 0) count += 1;
  if (filters.pendingReason.length > 0) count += 1;
  if (filters.periodSituation.length > 0) count += 1;
  if (filters.from || filters.to) count += 1;
  return count;
}

export function toArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((item) => toArray(item));
  return [String(value)];
}

export function toIntArray(value: unknown): number[] {
  return toArray(value)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

const FILTER_QUERY_KEYS = new Set([
  'year',
  'month',
  'week',
  'department',
  'province',
  'district',
  'sex',
  'ageGroup',
  'personState',
  'participant',
  'onlyClosed',
  'indicator',
  'evolutionIndicator',
  'cafState',
  'ccsState',
  'dataState',
  'metaOrigin',
  'controlType',
  'resultOrigin',
  'validation',
  'pendingIndicator',
  'pendingReason',
  'periodSituation',
  'from',
  'to',
  'compareBy'
]);

export function queryHasFilters(query: Record<string, unknown>): boolean {
  return Object.keys(query).some((key) => FILTER_QUERY_KEYS.has(key));
}

function first(value: unknown): string | undefined {
  const values = toArray(value);
  return values.length > 0 ? values[0] : undefined;
}

export function filtersFromQuery(
  query: Record<string, unknown>,
  meta: MetaInfo,
  view: ViewId
): Filters {
  const filters = queryHasFilters(query)
    ? emptyFilters()
    : defaultFiltersForView(view, meta);

  const year = toIntArray(query.year);
  if (year.length > 0) filters.years = year;

  const month = toIntArray(query.month).filter((item) => item >= 1 && item <= 12);
  if (month.length > 0) filters.months = month;

  const week = toArray(query.week);
  if (week.length > 0) filters.weeks = week;

  const department = first(query.department);
  if (department) filters.department = department;

  const province = first(query.province);
  if (province) filters.province = province;

  const districts = toArray(query.district);
  if (districts.length > 0) filters.districts = districts;

  const sexes = toArray(query.sex);
  if (sexes.length > 0) filters.sexes = sexes;

  const ageGroups = toArray(query.ageGroup);
  if (ageGroups.length > 0) filters.ageGroups = ageGroups;

  const personStates = toArray(query.personState);
  if (personStates.length > 0) filters.personStates = personStates;

  const participant = first(query.participant);
  if (participant != null) {
    const parsed = Number.parseInt(participant, 10);
    if (Number.isFinite(parsed)) filters.participant = parsed;
  }

  if (query.onlyClosed != null) {
    const value = first(query.onlyClosed);
    filters.onlyClosed = value === 'true' || value === '1';
  }

  const indicator = first(query.indicator);
  if (indicator === 'CAF' || indicator === 'CCS' || indicator === 'FCM') {
    filters.indicator = indicator;
  }

  const evolutionIndicator = first(query.evolutionIndicator);
  if (
    evolutionIndicator === 'CAF' ||
    evolutionIndicator === 'CCS' ||
    evolutionIndicator === 'FCM'
  ) {
    filters.evolutionIndicator = evolutionIndicator;
  }

  const cafState = toArray(query.cafState);
  if (cafState.length > 0) filters.cafState = cafState;

  const ccsState = toArray(query.ccsState);
  if (ccsState.length > 0) filters.ccsState = ccsState;

  const dataState = toArray(query.dataState);
  if (dataState.length > 0) filters.dataState = dataState;

  const metaOrigin = toArray(query.metaOrigin);
  if (metaOrigin.length > 0) filters.metaOrigin = metaOrigin;

  const controlType = toArray(query.controlType);
  if (controlType.length > 0) filters.controlType = controlType;

  const resultOrigin = toArray(query.resultOrigin);
  if (resultOrigin.length > 0) filters.resultOrigin = resultOrigin;

  const validation = toArray(query.validation);
  if (validation.length > 0) filters.validation = validation;

  const pendingIndicator = toArray(query.pendingIndicator);
  if (pendingIndicator.length > 0) filters.pendingIndicator = pendingIndicator;

  const pendingReason = toArray(query.pendingReason);
  if (pendingReason.length > 0) filters.pendingReason = pendingReason;

  const periodSituation = toArray(query.periodSituation);
  if (periodSituation.length > 0) filters.periodSituation = periodSituation;

  const from = first(query.from);
  if (from) filters.from = from;

  const to = first(query.to);
  if (to) filters.to = to;

  const compareBy = first(query.compareBy);
  if (compareBy === 'distrito' || compareBy === 'edad' || compareBy === 'sexo') {
    filters.compareBy = compareBy;
  }

  return filters;
}
