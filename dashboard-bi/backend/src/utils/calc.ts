import { AggregateResult, IndicatorCode, IndicatorState } from '../types';

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function indicatorState(
  indicator: IndicatorCode,
  percentage: number | null
): IndicatorState {
  if (percentage == null || Number.isNaN(percentage)) return 'SIN_DATOS';
  if (indicator === 'CAF') {
    if (percentage >= 100) return 'OPTIMO';
    if (percentage >= 70) return 'BUENO';
    if (percentage >= 50) return 'REGULAR';
    return 'MALO';
  }
  if (percentage >= 100) return 'BUENO';
  if (percentage > 0) return 'REGULAR';
  return 'MALO';
}

interface AggregateInput {
  numerador: number | null;
  denominador: number | null;
  es_evaluable: number | boolean | null;
}

/**
 * Regla única: 100 * SUM(numerador) / SUM(denominador) usando solo registros
 * evaluables. Nunca se promedian porcentajes. Sin denominador => null.
 */
export function aggregate(
  rows: AggregateInput[],
  indicator: IndicatorCode
): AggregateResult {
  let numerator = 0;
  let denominator = 0;
  let evaluables = 0;

  for (const row of rows) {
    if (Number(row.es_evaluable) !== 1) continue;
    evaluables += 1;
    numerator += Number(row.numerador ?? 0);
    denominator += Number(row.denominador ?? 0);
  }

  const percentage = denominator > 0 ? round((100 * numerator) / denominator, 2) : null;

  return {
    numerator: round(numerator, 2),
    denominator: round(denominator, 2),
    evaluables,
    percentage,
    state: indicatorState(indicator, percentage)
  };
}

export function aggregateBy<T extends AggregateInput>(
  rows: T[],
  key: (row: T) => string,
  indicator: IndicatorCode
): Map<string, AggregateResult> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const bucket = groups.get(id);
    if (bucket) bucket.push(row);
    else groups.set(id, [row]);
  }

  const result = new Map<string, AggregateResult>();
  for (const [id, bucket] of groups) {
    result.set(id, aggregate(bucket, indicator));
  }
  return result;
}

export function sumField<T>(rows: T[], field: (row: T) => number | null | undefined): number {
  let total = 0;
  for (const row of rows) {
    total += Number(field(row) ?? 0);
  }
  return round(total, 2);
}

export function countWhere<T>(rows: T[], predicate: (row: T) => boolean): number {
  let total = 0;
  for (const row of rows) {
    if (predicate(row)) total += 1;
  }
  return total;
}

export const STATE_LABELS: Record<IndicatorState | 'NEUTRO', string> = {
  OPTIMO: 'Óptimo',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo',
  DATOS_PENDIENTES: 'Pendiente',
  SIN_META: 'Sin meta',
  NO_PROGRAMADO: 'No programado',
  SIN_DATOS: 'Sin datos',
  NEUTRO: 'Neutro'
};

export function stateLabel(state: IndicatorState | 'NEUTRO'): string {
  return STATE_LABELS[state] ?? String(state);
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return 'Sin datos';
  return `${new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)} %`;
}

export function formatNumber(value: number | null, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return 'Sin datos';
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export const INDICATOR_LABELS: Record<IndicatorCode, string> = {
  CAF: 'Actividad física',
  CCS: 'Contacto social',
  FCM: 'Factores cardiometabólicos'
};

export const INDICATOR_HELP: Record<IndicatorCode, string> = {
  CAF:
    '100 × suma de minutos realizados / suma de minutos de meta. Solo registros evaluables. ' +
    'Óptimo ≥ 100 %, Bueno ≥ 70 %, Regular ≥ 50 %, Malo < 50 %.',
  CCS:
    '100 × suma de días con contacto / suma de días de meta. Solo registros evaluables. ' +
    'Bueno = 100 %, Regular > 0 %, Malo = 0 %.',
  FCM:
    '100 × suma de factores dentro de meta / suma de factores previstos. Solo meses con todos los factores evaluados. ' +
    'Bueno = 100 %, Regular > 0 %, Malo = 0 %.'
};
