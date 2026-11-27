import { IndicatorState, KpiFormat } from '../types';

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return 'Sin datos';
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return 'Sin datos';
  return `${new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)} %`;
}

export function formatKpi(value: number | null | undefined, format: KpiFormat): string {
  if (value == null || Number.isNaN(value)) return 'Sin datos';
  if (format === 'percent') return formatPercent(value);
  if (format === 'pp') return `${value > 0 ? '+' : ''}${formatNumber(value, 1)} pp`;
  return formatNumber(value, 0);
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

export const DATA_STATE_LABELS: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  EN_CURSO: 'En curso',
  PENDIENTE: 'Pendiente',
  SIN_META: 'Sin meta',
  DENTRO_META: 'Dentro de meta',
  FUERA_META: 'Fuera de meta',
  META_INCOMPLETA: 'Meta incompleta',
  NO_PROGRAMADO: 'No programado',
  NO_VIGENTE: 'No vigente',
  PERIODO_CERRADO: 'Periodo cerrado',
  PERIODO_EN_CURSO: 'Periodo en curso',
  NO_APLICA: 'No aplica',
  AUTORREPORTE: 'Autorreporte',
  CONSULTA_MEDICA: 'Consulta médica',
  LABORATORIO: 'Laboratorio',
  VALIDADO: 'Validado',
  NO_REQUIERE: 'No requiere'
};

export function stateLabel(state: string): string {
  return (
    STATE_LABELS[state as keyof typeof STATE_LABELS] ??
    DATA_STATE_LABELS[state] ??
    state
  );
}

export interface StateStyle {
  background: string;
  color: string;
  border: string;
}

export function stateStyle(state: string): StateStyle {
  switch (state) {
    case 'OPTIMO':
      return { background: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
    case 'BUENO':
    case 'CONFIRMADO':
    case 'DENTRO_META':
    case 'VALIDADO':
      return { background: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
    case 'REGULAR':
      return { background: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
    case 'MALO':
    case 'FUERA_META':
      return { background: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
    case 'EN_CURSO':
    case 'PERIODO_EN_CURSO':
      return { background: '#ECFEFF', color: '#0E7490', border: '#A5F3FC' };
    case 'DATOS_PENDIENTES':
    case 'PENDIENTE':
    case 'META_INCOMPLETA':
      return { background: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
    case 'SIN_META':
    case 'NO_PROGRAMADO':
    case 'NO_VIGENTE':
      return { background: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
    case 'PERIODO_CERRADO':
      return { background: '#FFFBEB', color: '#92400E', border: '#FCD34D' };
    case 'NO_APLICA':
    case 'SIN_DATOS':
      return { background: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0' };
    default:
      return { background: '#F1F5F9', color: '#334155', border: '#E2E8F0' };
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function participantLabel(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? `Participante #${number}` : String(value ?? '');
}

export function formatCell(value: unknown, type?: string): string {
  if (value == null || value === '') return '—';
  if (type === 'participant') return participantLabel(value);
  if (type === 'percent') return formatPercent(Number(value));
  if (type === 'number') return formatNumber(Number(value));
  if (type === 'state') return stateLabel(String(value));
  return String(value);
}
