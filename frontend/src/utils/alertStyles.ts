import { Alerta } from '../types';
import { Sparkles, CheckCircle2, AlertTriangle, AlertOctagon, Bell, LucideIcon } from 'lucide-react';

export type AlertaSeveridad = 'bueno' | 'advertencia' | 'grave' | 'info';

export interface AlertaVisualConfig {
  severidad: AlertaSeveridad;
  etiqueta: string;
  badgeClass: string;
  cardClass: string;
  borderAccentClass: string;
  iconBgClass: string;
  iconColorClass: string;
  Icon: LucideIcon;
}

export function getAlertaVisualConfig(a: Alerta): AlertaVisualConfig {
  const motivo = (a.motivo || '').trim();
  const mensaje = (a.mensaje || a.nombre_regla || '').toLowerCase();
  const regla = (a.nombre_regla || '').toLowerCase();

  // 1. Mensajes GRAVES / ERROR / CLÍNICOS URGENTES (Rojo)
  // Controles médicos vencidos sin resultado
  if (
    motivo === 'Control vencido sin resultado' ||
    regla.includes('vencido') ||
    mensaje.includes('vencido') ||
    mensaje.includes('pendiente de resultado')
  ) {
    return {
      severidad: 'grave',
      etiqueta: 'Control vencido',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      cardClass: 'bg-rose-50/70 border-rose-200 hover:bg-rose-50/90',
      borderAccentClass: 'border-l-4 border-l-rose-500',
      iconBgClass: 'bg-rose-100 text-rose-600',
      iconColorClass: 'text-rose-600',
      Icon: AlertOctagon,
    };
  }

  // 2. Mensajes BUENOS / FELICITACIONES / METAS LOGRADAS (Verde)
  // Felicitaciones por caminata, contacto, meta cumplida
  const esFelicitacion =
    mensaje.includes('felicitaciones') ||
    mensaje.includes('excelente') ||
    mensaje.includes('grandioso') ||
    mensaje.includes('alcanzaste tu meta') ||
    mensaje.includes('cumpliste tu meta') ||
    mensaje.includes('completaste');

  if (esFelicitacion) {
    return {
      severidad: 'bueno',
      etiqueta: '¡Felicitaciones!',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
      cardClass: 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50/80',
      borderAccentClass: 'border-l-4 border-l-emerald-500',
      iconBgClass: 'bg-emerald-100 text-emerald-700',
      iconColorClass: 'text-emerald-600',
      Icon: Sparkles,
    };
  }

  // 3. Mensajes de ADVERTENCIA / PENDIENTES (Ámbar / Naranja)
  // Meta semanal sin alcanzar, datos del día anterior sin confirmar
  if (
    motivo === 'Meta semanal sin alcanzar' ||
    motivo === 'Dato sin confirmar' ||
    regla.includes('sin confirmar') ||
    regla.includes('sin alcanzar') ||
    mensaje.includes('sin confirmar') ||
    mensaje.includes('sin alcanzar') ||
    mensaje.includes('te faltan')
  ) {
    return {
      severidad: 'advertencia',
      etiqueta: motivo === 'Meta semanal sin alcanzar' ? 'Meta en riesgo' : 'Dato pendiente',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      cardClass: 'bg-amber-50/60 border-amber-200 hover:bg-amber-50/80',
      borderAccentClass: 'border-l-4 border-l-amber-500',
      iconBgClass: 'bg-amber-100 text-amber-700',
      iconColorClass: 'text-amber-600',
      Icon: AlertTriangle,
    };
  }

  // 4. Mensajes INFORMATIVOS / MOTIVACIÓN GENERAL (Azul / Teal)
  // Recordatorio proactivo de caminata del día
  return {
    severidad: 'info',
    etiqueta: motivo || 'Motivación diaria',
    badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200 font-bold',
    cardClass: 'bg-teal-50/50 border-teal-200 hover:bg-teal-50/70',
    borderAccentClass: 'border-l-4 border-l-teal-600',
    iconBgClass: 'bg-teal-100 text-health-petroleo',
    iconColorClass: 'text-health-petroleo',
    Icon: Bell,
  };
}
