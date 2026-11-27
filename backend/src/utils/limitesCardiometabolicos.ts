export type TipoControlCardiometabolico = 'Presión arterial' | 'Glucosa' | 'Colesterol LDL' | 'IMC';

export interface LimitesMetaControl {
  min?: number | null;
  max?: number | null;
  maxDiast?: number | null;
}

export interface ValoresControl {
  sistolica?: number | string | null;
  diastolica?: number | string | null;
  numerico?: number | string | null;
}

// Pisos fisiológicos: un valor por debajo de estos límites no puede considerarse
// dentro de meta, aunque la meta configurada sólo defina un techo.
export const PISOS_FISIOLOGICOS = {
  sistolica: 90,
  diastolica: 60,
  glucosa: 70,
  colesterolLdl: 10,
  imc: 18.5,
} as const;

const PISO_POR_TIPO: Record<Exclude<TipoControlCardiometabolico, 'Presión arterial'>, number> = {
  'Glucosa': PISOS_FISIOLOGICOS.glucosa,
  'Colesterol LDL': PISOS_FISIOLOGICOS.colesterolLdl,
  'IMC': PISOS_FISIOLOGICOS.imc,
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Indica si una medición cumple la meta del control.
 * Presión arterial exige ambos límites (superior e inferior) en sistólica y diastólica.
 * Los demás factores usan el rango configurado y, si falta el mínimo, el piso clínico.
 */
export function evaluarDentroDeMeta(
  tipo: TipoControlCardiometabolico,
  valores: ValoresControl,
  limites: LimitesMetaControl,
): boolean {
  if (tipo === 'Presión arterial') {
    const sis = toNumber(valores.sistolica);
    const dia = toNumber(valores.diastolica);
    if (sis === null || dia === null) return false;

    const minSis = toNumber(limites.min) ?? PISOS_FISIOLOGICOS.sistolica;
    const maxSis = toNumber(limites.max) ?? 120;
    const minDia = PISOS_FISIOLOGICOS.diastolica;
    const maxDia = toNumber(limites.maxDiast) ?? 80;

    return sis >= minSis && sis <= maxSis
      && dia >= minDia && dia <= maxDia
      && sis > dia;
  }

  const valor = toNumber(valores.numerico);
  if (valor === null) return false;

  const min = toNumber(limites.min) ?? PISO_POR_TIPO[tipo];
  const max = toNumber(limites.max) ?? Infinity;
  return valor >= min && valor <= max;
}

/**
 * Valida que la medición sea fisiológicamente registrable.
 * Devuelve el mensaje de error o null si es válida.
 */
export function errorPlausibilidad(
  tipo: TipoControlCardiometabolico,
  valores: ValoresControl,
): string | null {
  if (tipo === 'Presión arterial') {
    const sis = toNumber(valores.sistolica);
    const dia = toNumber(valores.diastolica);
    if (sis === null || dia === null) {
      return 'La presión arterial exige el par de valores: sistólica y diastólica.';
    }
    if (sis <= 0 || dia <= 0) {
      return 'La presión arterial debe registrarse con valores positivos.';
    }
    if (sis <= dia) {
      return 'La presión sistólica debe ser mayor que la diastólica.';
    }
    return null;
  }

  const valor = toNumber(valores.numerico);
  if (valor === null) {
    return `Para ${tipo} se requiere ingresar el valor numérico medido.`;
  }
  if (valor <= 0) {
    return `El valor de ${tipo} debe ser mayor que cero.`;
  }
  return null;
}
