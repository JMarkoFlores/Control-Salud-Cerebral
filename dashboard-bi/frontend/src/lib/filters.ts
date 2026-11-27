import { FilterOptions, Filters, MetaInfo, ViewId } from '../types';

export const VIEW_IDS: ViewId[] = [
  'resumen',
  'actividad',
  'contacto',
  'cardiometabolicos',
  'pendientes',
  'evolucion'
];

export const VIEW_LABELS: Record<ViewId, string> = {
  resumen: 'Resumen',
  actividad: 'Actividad física',
  contacto: 'Contacto social',
  cardiometabolicos: 'Cardiometabólicos',
  pendientes: 'Pendientes',
  evolucion: 'Evolución'
};

export const VIEW_PATHS: Record<ViewId, string> = {
  resumen: '/',
  actividad: '/actividad',
  contacto: '/contacto',
  cardiometabolicos: '/cardiometabolicos',
  pendientes: '/pendientes',
  evolucion: '/evolucion'
};

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

function yearOf(value: string): number {
  return Number(value.slice(0, 4));
}

function monthOf(value: string): number {
  return Number(value.slice(5, 7));
}

function addMonths(value: string, months: number): string {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

export function defaultsForView(view: ViewId, meta: MetaInfo): Filters {
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

const FILTER_KEYS = new Set([
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
  'evolutionIndicator',
  'from',
  'to',
  'compareBy'
]);

export function hasFilterParams(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (FILTER_KEYS.has(key)) return true;
  }
  return false;
}

function all(params: URLSearchParams, key: string): string[] {
  return params.getAll(key);
}

function first(params: URLSearchParams, key: string): string | undefined {
  return params.get(key) ?? undefined;
}

function numbers(params: URLSearchParams, key: string): number[] {
  return all(params, key)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));
}

export function parseFilters(
  params: URLSearchParams,
  meta: MetaInfo,
  view: ViewId
): Filters {
  if (!hasFilterParams(params)) return defaultsForView(view, meta);

  const filters = emptyFilters();
  filters.years = numbers(params, 'year');
  filters.months = numbers(params, 'month');
  filters.weeks = all(params, 'week');
  const department = first(params, 'department');
  if (department) filters.department = department;
  const province = first(params, 'province');
  if (province) filters.province = province;
  filters.districts = all(params, 'district');
  filters.sexes = all(params, 'sex');
  filters.ageGroups = all(params, 'ageGroup');
  filters.personStates = all(params, 'personState');

  const participant = first(params, 'participant');
  if (participant) {
    const parsed = Number.parseInt(participant, 10);
    if (Number.isFinite(parsed)) filters.participant = parsed;
  }

  filters.onlyClosed = params.get('onlyClosed') === 'true';

  const indicator = first(params, 'indicator');
  if (indicator === 'CAF' || indicator === 'CCS' || indicator === 'FCM') {
    filters.indicator = indicator;
  }
  filters.cafState = all(params, 'cafState');
  filters.ccsState = all(params, 'ccsState');
  filters.dataState = all(params, 'dataState');
  filters.metaOrigin = all(params, 'metaOrigin');
  filters.controlType = all(params, 'controlType');
  filters.resultOrigin = all(params, 'resultOrigin');
  filters.validation = all(params, 'validation');
  filters.pendingIndicator = all(params, 'pendingIndicator');
  filters.pendingReason = all(params, 'pendingReason');
  filters.periodSituation = all(params, 'periodSituation');

  const evolutionIndicator = first(params, 'evolutionIndicator');
  if (
    evolutionIndicator === 'CAF' ||
    evolutionIndicator === 'CCS' ||
    evolutionIndicator === 'FCM'
  ) {
    filters.evolutionIndicator = evolutionIndicator;
  }
  const from = first(params, 'from');
  if (from) filters.from = from;
  const to = first(params, 'to');
  if (to) filters.to = to;

  const compareBy = first(params, 'compareBy');
  if (compareBy === 'distrito' || compareBy === 'edad' || compareBy === 'sexo') {
    filters.compareBy = compareBy;
  }

  if (view === 'evolucion' && (!filters.from || !filters.to)) {
    const fallback = defaultsForView('evolucion', meta);
    if (!filters.from) filters.from = fallback.from;
    if (!filters.to) filters.to = fallback.to;
  }

  return filters;
}

export interface FilterChip {
  id: string;
  label: string;
  remove: (filters: Filters) => Filters;
}

function without<T>(items: T[], value: T): T[] {
  return items.filter((item) => item !== value);
}

function clone(filters: Filters): Filters {
  return {
    ...filters,
    years: [...filters.years],
    months: [...filters.months],
    weeks: [...filters.weeks],
    districts: [...filters.districts],
    sexes: [...filters.sexes],
    ageGroups: [...filters.ageGroups],
    personStates: [...filters.personStates],
    cafState: [...filters.cafState],
    ccsState: [...filters.ccsState],
    dataState: [...filters.dataState],
    metaOrigin: [...filters.metaOrigin],
    controlType: [...filters.controlType],
    resultOrigin: [...filters.resultOrigin],
    validation: [...filters.validation],
    pendingIndicator: [...filters.pendingIndicator],
    pendingReason: [...filters.pendingReason],
    periodSituation: [...filters.periodSituation]
  };
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

function optionLabel(
  options: FilterOptions | null,
  key: keyof FilterOptions,
  value: string
): string {
  const list = options?.[key];
  if (Array.isArray(list)) {
    const found = list.find((item) => {
      if (typeof item === 'string') return item === value;
      if (item && typeof item === 'object' && 'value' in item) {
        return String((item as { value: string }).value) === value;
      }
      return false;
    });
    if (typeof found === 'string') return found;
    if (found && typeof found === 'object' && 'label' in found) {
      return String((found as { label: string }).label);
    }
  }
  return value;
}

export function buildChips(
  filters: Filters,
  options: FilterOptions | null,
  view: ViewId
): FilterChip[] {
  const chips: FilterChip[] = [];
  const viewFilters: Record<ViewId, Set<keyof Filters>> = {
    resumen: new Set<keyof Filters>(['indicator']),
    actividad: new Set<keyof Filters>(['cafState', 'dataState', 'metaOrigin']),
    contacto: new Set<keyof Filters>(['ccsState', 'dataState', 'metaOrigin']),
    cardiometabolicos: new Set<keyof Filters>([
      'controlType',
      'dataState',
      'resultOrigin',
      'validation'
    ]),
    pendientes: new Set<keyof Filters>([
      'pendingIndicator',
      'controlType',
      'dataState',
      'pendingReason',
      'periodSituation'
    ]),
    evolucion: new Set<keyof Filters>(['evolutionIndicator', 'from', 'to', 'compareBy'])
  };
  const allowed = viewFilters[view];

  for (const year of filters.years) {
    chips.push({
      id: `year-${year}`,
      label: `Año ${year}`,
      remove: (current) => ({ ...clone(current), years: without(current.years, year) })
    });
  }

  for (const month of filters.months) {
    chips.push({
      id: `month-${month}`,
      label: `Mes ${MONTH_NAMES[month - 1] ?? month}`,
      remove: (current) => ({ ...clone(current), months: without(current.months, month) })
    });
  }

  for (const week of filters.weeks) {
    chips.push({
      id: `week-${week}`,
      label: optionLabel(options, 'weeks', week),
      remove: (current) => ({ ...clone(current), weeks: without(current.weeks, week) })
    });
  }

  if (filters.department) {
    chips.push({
      id: 'department',
      label: `Departamento: ${filters.department}`,
      remove: (current) => {
        const next = clone(current);
        next.department = undefined;
        next.province = undefined;
        next.districts = [];
        return next;
      }
    });
  }

  if (filters.province) {
    chips.push({
      id: 'province',
      label: `Provincia: ${filters.province}`,
      remove: (current) => {
        const next = clone(current);
        next.province = undefined;
        next.districts = [];
        return next;
      }
    });
  }

  for (const district of filters.districts) {
    chips.push({
      id: `district-${district}`,
      label: `Distrito: ${district}`,
      remove: (current) => ({
        ...clone(current),
        districts: without(current.districts, district)
      })
    });
  }

  for (const sex of filters.sexes) {
    chips.push({
      id: `sex-${sex}`,
      label: optionLabel(options, 'sexes', sex),
      remove: (current) => ({ ...clone(current), sexes: without(current.sexes, sex) })
    });
  }

  for (const group of filters.ageGroups) {
    chips.push({
      id: `age-${group}`,
      label: `Edad ${group}`,
      remove: (current) => ({
        ...clone(current),
        ageGroups: without(current.ageGroups, group)
      })
    });
  }

  for (const state of filters.personStates) {
    chips.push({
      id: `person-${state}`,
      label: `Participante ${state.toLowerCase()}`,
      remove: (current) => ({
        ...clone(current),
        personStates: without(current.personStates, state)
      })
    });
  }

  if (filters.participant != null) {
    chips.push({
      id: 'participant',
      label: `Participante #${filters.participant}`,
      remove: (current) => ({ ...clone(current), participant: undefined })
    });
  }

  if (filters.onlyClosed) {
    chips.push({
      id: 'onlyClosed',
      label: 'Solo periodos cerrados',
      remove: (current) => ({ ...clone(current), onlyClosed: false })
    });
  }

  if (filters.indicator && allowed.has('indicator')) {
    chips.push({
      id: 'indicator',
      label: `Indicador: ${optionLabel(options, 'indicators', filters.indicator)}`,
      remove: (current) => ({ ...clone(current), indicator: undefined })
    });
  }

  const multi: Array<{
    key: keyof Filters;
    optionKey: keyof FilterOptions;
    prefix: string;
  }> = [
    { key: 'cafState', optionKey: 'cafStates', prefix: 'Estado CAF' },
    { key: 'ccsState', optionKey: 'ccsStates', prefix: 'Estado CCS' },
    { key: 'dataState', optionKey: 'dataStates', prefix: 'Estado de datos' },
    { key: 'metaOrigin', optionKey: 'metaOrigins', prefix: 'Origen de meta' },
    { key: 'controlType', optionKey: 'controlTypes', prefix: 'Tipo de control' },
    { key: 'resultOrigin', optionKey: 'resultOrigins', prefix: 'Origen del resultado' },
    { key: 'validation', optionKey: 'validations', prefix: 'Validación' },
    { key: 'pendingIndicator', optionKey: 'indicators', prefix: 'Indicador' },
    { key: 'pendingReason', optionKey: 'pendingReasons', prefix: 'Motivo' },
    { key: 'periodSituation', optionKey: 'periodSituations', prefix: 'Situación' }
  ];

  for (const entry of multi) {
    if (!allowed.has(entry.key)) continue;
    const values = filters[entry.key] as string[];
    for (const value of values) {
      chips.push({
        id: `${entry.key}-${value}`,
        label: `${entry.prefix}: ${optionLabel(options, entry.optionKey, value)}`,
        remove: (current) => ({
          ...clone(current),
          [entry.key]: without(values, value)
        })
      });
    }
  }

  if (filters.evolutionIndicator && allowed.has('evolutionIndicator')) {
    chips.push({
      id: 'evolutionIndicator',
      label: `Indicador: ${optionLabel(options, 'indicators', filters.evolutionIndicator)}`,
      remove: (current) => ({ ...clone(current), evolutionIndicator: undefined })
    });
  }

  if (filters.from && allowed.has('from')) {
    chips.push({
      id: 'from',
      label: `Desde ${filters.from}`,
      remove: (current) => ({ ...clone(current), from: undefined })
    });
  }

  if (filters.to && allowed.has('to')) {
    chips.push({
      id: 'to',
      label: `Hasta ${filters.to}`,
      remove: (current) => ({ ...clone(current), to: undefined })
    });
  }

  if (filters.compareBy !== 'distrito' && allowed.has('compareBy')) {
    chips.push({
      id: 'compareBy',
      label: `Comparar por ${filters.compareBy}`,
      remove: (current) => ({ ...clone(current), compareBy: 'distrito' })
    });
  }

  return chips;
}
