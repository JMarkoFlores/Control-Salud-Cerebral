export type Role = 'TITULAR' | 'ADMIN';

export interface User {
  cuenta_id: number;
  persona_id: number;
  persona_titular_id: number;
  correo_acceso: string;
  rol: Role;
  nombres: string;
  apellidos: string;
  codigo_interno: string;
  distrito?: string;
  nombre_contacto?: string;
  parentesco?: string;
}

export interface KpiEstado {
  codigo: string;
  label: string;
  color: string;
  badgeClass: string;
  descripcionMotivacional: string;
}

export interface KpiData {
  codigoKpi: 'CAF' | 'CCS' | 'FCM';
  titulo: string;
  porcentaje: number | null;
  porcentajeTexto: string;
  numerador: number;
  denominador: number;
  unidad: string;
  estado: KpiEstado;
  mensajeMotivador: string;
  esEvaluable: boolean;
  diasPendientes?: number;
  detalles?: any;
}

export interface DashboardData {
  puntajeSaludCerebral: number;
  categoriaRiesgo: 'BAJO' | 'MODERADO' | 'ALTO';
  categoriaDetalle: {
    codigo: string;
    label: string;
    color: string;
  };
  desglosePilares: {
    actividadFisica: number;
    contactoSocial: number;
    cardiometabolico: number;
  };
  kpis: {
    caf: KpiData;
    ccs: KpiData;
    fcm: KpiData;
  };
  totalAlertasPendientes: number;
  proximosRecordatorios: Recordatorio[];
  ultimosLogros: Logro[];
}

export interface SesionFisica {
  sesion_id: number;
  fecha_hora: string;
  tipo_actividad: 'Caminata' | 'Ejercicio' | 'Deporte' | 'Otro';
  duracion_minutos: number;
  origen: string;
  estado: 'VALIDO' | 'ANULADO';
}

export interface ContactoSocial {
  contacto_id: number;
  fecha_hora: string;
  modalidad: 'Llamadas' | 'Visita familiar' | 'Conversación presencial' | 'Videollamada' | 'Otro';
  origen: string;
  estado: 'VALIDO' | 'ANULADO';
}

export interface PanelDia {
  fecha: string;
  nombreDia: string;
  esHoy: boolean;
  esPasado: boolean;
  esFuturo: boolean;
  actividadFisica: {
    estado: 'CONFIRMADO_CON_REGISTRO' | 'CONFIRMADO_SIN_ACTIVIDAD' | 'PENDIENTE' | 'FUTURO';
    minutos: number;
    conteo: number;
  };
  contactoSocial: {
    estado: 'CONFIRMADO_CON_REGISTRO' | 'CONFIRMADO_SIN_ACTIVIDAD' | 'PENDIENTE' | 'FUTURO';
    conteo: number;
  };
}

export interface ControlProgramado {
  control_id: number;
  tipo_control: 'Presión arterial' | 'Glucosa' | 'Colesterol LDL' | 'IMC';
  mes_periodo: string;
  fecha_prevista: string;
  criterio_meta_texto: string;
  valor_meta_min?: number | null;
  valor_meta_max?: number | null;
  valor_meta_max_diast?: number | null;
  unidad: string;
  vigente: boolean;
  resultado_id?: number | null;
  fecha_medicion?: string | null;
  valor_numerico?: number | null;
  valor_sistolica?: number | null;
  valor_diastolica?: number | null;
  dentro_de_meta?: boolean | null;
}

export interface Recordatorio {
  recordatorio_id: number;
  tipo_aviso: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL' | 'CONTROL_SALUD' | 'CONFIRMACION_DIARIA';
  hora_programada: string;
  dias_semana: string;
  estado: 'ACTIVO' | 'PAUSADO';
  destino_tipo: string;
}

export interface Alerta {
  alerta_id: number;
  tipo_seguimiento: string;
  periodo_referencia: string;
  motivo: string;
  mensaje: string;
  estado: 'PENDIENTE' | 'ATENDIDA' | 'CERRADA';
  fecha_emision: string;
  fecha_atencion?: string | null;
  nombre_regla: string;
  titular_nombres?: string;
  codigo_interno?: string;
}

export interface Logro {
  logro_id: number;
  codigo_logro: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  desbloqueado: number;
  fecha_obtencion?: string | null;
  periodo_referencia?: string | null;
}
