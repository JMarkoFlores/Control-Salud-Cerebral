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
} from '../../types';
import { applyFilters } from '../../utils/filters';
import { formatMonthLabel, formatWeekLabel, monthOf, yearOf } from '../../utils/date';
import { STATE_LABELS } from '../../utils/calc';
import {
  MOCK_CONTROLS,
  MOCK_FCM,
  MOCK_INDICATORS,
  MOCK_META,
  MOCK_WEEKLY
} from './data';

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function sortText(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, 'es'));
}

function options(values: string[], labels?: Record<string, string>): FilterOption[] {
  return values.map((value) => ({ value, label: labels?.[value] ?? value }));
}

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

export class MockRepository implements DashboardRepository {
  async getMeta(): Promise<MetaInfo> {
    return { ...MOCK_META, defaults: { ...MOCK_META.defaults } };
  }

  async getFilterOptions(filters: Filters): Promise<FilterOptions> {
    const weeklyFiltered = applyFilters(MOCK_WEEKLY, filters, 'week');
    const fcmFiltered = applyFilters(MOCK_FCM, filters, 'month');
    const controlsFiltered = applyFilters(MOCK_CONTROLS, filters, 'month');

    const yearFilter = { ...filters, months: [], weeks: [] };
    const weekFilter = { ...filters, weeks: [] };

    const yearRows = [
      ...applyFilters(MOCK_WEEKLY, yearFilter, 'week'),
      ...applyFilters(MOCK_FCM, yearFilter, 'month')
    ];
    const monthRows = [
      ...applyFilters(MOCK_WEEKLY, yearFilter, 'week'),
      ...applyFilters(MOCK_FCM, yearFilter, 'month')
    ];
    const weekRows = applyFilters(MOCK_WEEKLY, weekFilter, 'week');

    const departmentRows = this.filterAll({
      ...filters,
      department: undefined,
      province: undefined,
      districts: []
    });
    const departments = unique(departmentRows.map((row) => row.departamento));

    const provinceRows = this.filterAll({
      ...filters,
      province: undefined,
      districts: []
    });
    const provinces = unique(provinceRows.map((row) => row.provincia));

    const districtRows = this.filterAll({ ...filters, districts: [] });
    const districts = unique(districtRows.map((row) => row.distrito));

    const sexRows = this.filterAll({ ...filters, sexes: [] });
    const sexes = unique(sexRows.map((row) => row.sexo));

    const ageRows = this.filterAll({ ...filters, ageGroups: [] });
    const ageGroups = unique(ageRows.map((row) => row.grupo_edad));

    const stateRows = this.filterAll({ ...filters, personStates: [] });
    const personStates = unique(stateRows.map((row) => row.estado_persona));

    const participantRows = this.filterAll({ ...filters, participant: undefined });
    const participants = unique(participantRows.map((row) => row.key_persona)).sort(
      (a, b) => a - b
    );

    const cafStates = unique(
      weeklyFiltered
        .filter((row) => row.codigo_indicador === 'CAF')
        .map((row) => row.estado_indicador)
    );
    const ccsStates = unique(
      weeklyFiltered
        .filter((row) => row.codigo_indicador === 'CCS')
        .map((row) => row.estado_indicador)
    );

    const dataStates = unique([
      ...weeklyFiltered.map((row) => row.estado_datos),
      ...fcmFiltered.map((row) => row.estado_datos),
      ...controlsFiltered.map((row) => row.estado_datos)
    ]);

    const metaOrigins = unique(
      weeklyFiltered
        .map((row) => row.origen_meta)
        .filter((value): value is string => value != null)
    );

    const controlTypes = unique(controlsFiltered.map((row) => row.tipo_control));
    const resultOrigins = unique(controlsFiltered.map((row) => row.origen_resultado));
    const validations = unique(controlsFiltered.map((row) => row.estado_validacion));

    const pendingReasons = unique([
      ...weeklyFiltered
        .filter((row) => ['PENDIENTE', 'SIN_META'].includes(row.estado_datos))
        .map((row) => row.estado_datos),
      ...controlsFiltered
        .filter((row) =>
          ['PENDIENTE', 'META_INCOMPLETA', 'NO_PROGRAMADO', 'SIN_META', 'NO_VIGENTE'].includes(
            row.estado_datos
          )
        )
        .map((row) => row.estado_datos)
    ]);

    return {
      years: unique(yearRows.map((row) => yearOf(row.periodo))).sort((a, b) => b - a),
      months: unique(monthRows.map((row) => monthOf(row.periodo)))
        .sort((a, b) => a - b)
        .map((month) => ({ value: String(month), label: formatMonthLabel(month) })),
      weeks: unique(weekRows.map((row) => row.periodo))
        .sort()
        .map((week) => ({ value: week, label: formatWeekLabel(week) })),
      departments: sortText(departments),
      provinces: sortText(provinces),
      districts: sortText(districts),
      sexes: options(sortText(sexes), { M: 'Masculino', F: 'Femenino' }),
      ageGroups: ['30-39', '40-49', '50-59', '60-65'].filter((group) =>
        ageGroups.includes(group)
      ),
      personStates: sortText(personStates),
      participants,
      indicators: [
        { value: 'CAF', label: 'Actividad física' },
        { value: 'CCS', label: 'Contacto social' },
        { value: 'FCM', label: 'Cardiometabólicos' }
      ],
      cafStates: options(sortText(cafStates), STATE_LABELS as Record<string, string>),
      ccsStates: options(sortText(ccsStates), STATE_LABELS as Record<string, string>),
      dataStates: options(sortText(dataStates), DATA_STATE_LABELS),
      metaOrigins: sortText(metaOrigins),
      controlTypes: sortText(controlTypes),
      resultOrigins: sortText(resultOrigins),
      validations: sortText(validations),
      pendingReasons: options(sortText(pendingReasons), PENDING_REASON_LABELS),
      periodSituations: PERIOD_SITUATIONS,
      defaults: { ...MOCK_META.defaults }
    };
  }

  async getWeeklyRows(filters: Filters): Promise<WeeklyRow[]> {
    return applyFilters(MOCK_WEEKLY, filters, 'week');
  }

  async getFcmRows(filters: Filters): Promise<FcmRow[]> {
    return applyFilters(MOCK_FCM, filters, 'month');
  }

  async getControlRows(filters: Filters): Promise<ControlRow[]> {
    return applyFilters(MOCK_CONTROLS, filters, 'month');
  }

  async getIndicatorRows(filters: Filters): Promise<IndicatorRow[]> {
    const weekly = applyFilters(
      MOCK_INDICATORS.filter((row) => row.periodicidad === 'SEMANAL'),
      filters,
      'week'
    );
    const monthly = applyFilters(
      MOCK_INDICATORS.filter((row) => row.periodicidad === 'MENSUAL'),
      filters,
      'month'
    );
    return [...weekly, ...monthly];
  }

  private filterAll(filters: Filters): Array<WeeklyRow | FcmRow | ControlRow> {
    return [
      ...applyFilters(MOCK_WEEKLY, filters, 'week'),
      ...applyFilters(MOCK_FCM, filters, 'month'),
      ...applyFilters(MOCK_CONTROLS, filters, 'month')
    ];
  }
}
