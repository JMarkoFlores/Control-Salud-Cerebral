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

export const ESTADOS_KPI = {
  META_LOGRADA: {
    codigo: 'META_LOGRADA',
    label: '¡Meta lograda!',
    color: '#10B981', // Verde esmeralda
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    descripcionMotivacional: '¡Excelente trabajo! Tu constancia protege tu salud cerebral y reduce el riesgo de deterioro.'
  },
  EN_PROGRESO: {
    codigo: 'EN_PROGRESO',
    label: 'En progreso',
    color: '#F59E0B', // Ámbar
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
    descripcionMotivacional: '¡Vas muy bien! Estás a un paso de alcanzar tu meta de la semana. ¡Sigue adelante!'
  },
  AVANCE_INICIAL: {
    codigo: 'AVANCE_INICIAL',
    label: 'Avance inicial',
    color: '#F97316', // Naranja
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-300',
    descripcionMotivacional: '¡Buen comienzo! Cada paso suma, te falta poco para subir al siguiente nivel de protección.'
  },
  SIN_ACTIVIDAD_CONFIRMADO: {
    codigo: 'SIN_ACTIVIDAD_CONFIRMADO',
    label: 'Sin actividad/contacto',
    color: '#EF4444', // Coral suave
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    descripcionMotivacional: 'Confirmaste que no realizaste actividad. ¡Hoy es una nueva oportunidad para reactivarte!'
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
    descripcionMotivacional: 'Aún no defines una meta vigente para este periodo. Configúrala en la pestaña de metas.'
  }
} as const;

export const CATEGORIAS_RIESGO = {
  BAJO: { codigo: 'BAJO', label: 'Riesgo Bajo', min: 80, max: 100, color: '#10B981' },
  MODERADO: { codigo: 'MODERADO', label: 'Riesgo Moderado', min: 50, max: 79.99, color: '#F59E0B' },
  ALTO: { codigo: 'ALTO', label: 'Riesgo Alto', min: 0, max: 49.99, color: '#EF4444' }
} as const;
