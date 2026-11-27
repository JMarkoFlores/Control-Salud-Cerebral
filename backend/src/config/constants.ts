export const TABLES_PREVENCION_17 = [
  'ubicacion',
  'persona',
  'cuenta_rol',
  'meta_semanal',
  'sesion_fisica',
  'contacto_social',
  'confirmacion_diaria',
  'control_programado',
  'resultado_control',
  'regla_alerta',
  'ejecucion_regla',
  'alerta',
  'evaluacion_salud_cerebral',
  'simulacion_riesgo',
  'recordatorio',
  'catalogo_logro',
  'logro_obtenido'
] as const;

export const PESOS_SALUD_CEREBRAL = {
  ACTIVIDAD_FISICA: 0.35,
  CONTACTO_SOCIAL: 0.35,
  CARDIOMETABOLICO: 0.30,
};

// Estados oficiales del informe (CAF: 100/70/50; CCS y FCM: 100/0).
export const ESTADOS_KPI = {
  OPTIMO: {
    codigo: 'OPTIMO',
    label: 'Óptimo',
    color: '#059669', // Verde
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    descripcionMotivacional: 'Cumpliste la meta completa. Tu constancia protege tu salud cerebral y reduce el riesgo de deterioro.'
  },
  BUENO: {
    codigo: 'BUENO',
    label: 'Bueno',
    color: '#10B981', // Verde esmeralda
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    descripcionMotivacional: 'Vas por buen camino. Sostén el ritmo para cerrar el periodo dentro de la meta.'
  },
  REGULAR: {
    codigo: 'REGULAR',
    label: 'Regular',
    color: '#F59E0B', // Ámbar
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
    descripcionMotivacional: 'Avance parcial. Aún puedes alcanzar la meta si mantienes el registro y la constancia.'
  },
  MALO: {
    codigo: 'MALO',
    label: 'Malo',
    color: '#EF4444', // Coral
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    descripcionMotivacional: 'Cumplimiento bajo. Hoy es una nueva oportunidad para reactivar tus hábitos protectores.'
  },
  DATOS_PENDIENTES: {
    codigo: 'DATOS_PENDIENTES',
    label: 'Datos pendientes',
    color: '#64748B', // Pizarra
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    descripcionMotivacional: 'Confirma tus días pendientes en el panel para ver tu avance real y actualizar tu puntaje.'
  },
  SIN_META: {
    codigo: 'SIN_META',
    label: 'Sin meta',
    color: '#94A3B8',
    badgeClass: 'bg-gray-100 text-gray-500 border-gray-300',
    descripcionMotivacional: 'Aún no tienes una meta o un control programado para este periodo.'
  }
} as const;

export type EstadoKpiClave = keyof typeof ESTADOS_KPI;

/**
 * Clasificación oficial del informe. Recibe el porcentaje sin redondear:
 * 69.96 % es Regular, aunque se muestre como 70.0 %.
 */
export function clasificarIndicador(
  codigo: 'CAF' | 'CCS' | 'FCM',
  porcentaje: number | null | undefined
): EstadoKpiClave {
  if (porcentaje === null || porcentaje === undefined || Number.isNaN(porcentaje)) {
    return 'DATOS_PENDIENTES';
  }
  if (codigo === 'CAF') {
    if (porcentaje >= 100) return 'OPTIMO';
    if (porcentaje >= 70) return 'BUENO';
    if (porcentaje >= 50) return 'REGULAR';
    return 'MALO';
  }
  if (porcentaje >= 100) return 'BUENO';
  if (porcentaje > 0) return 'REGULAR';
  return 'MALO';
}

export const CATEGORIAS_RIESGO = {
  BAJO: { codigo: 'BAJO', label: 'Riesgo Bajo', min: 80, max: 100, color: '#10B981' },
  MODERADO: { codigo: 'MODERADO', label: 'Riesgo Moderado', min: 50, max: 79.99, color: '#F59E0B' },
  ALTO: { codigo: 'ALTO', label: 'Riesgo Alto', min: 0, max: 49.99, color: '#EF4444' }
} as const;
