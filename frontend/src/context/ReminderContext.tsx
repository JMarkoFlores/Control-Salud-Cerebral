import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { Recordatorio } from '../types';
import {
  playReminderChime,
  sendDesktopNotification,
  requestDesktopNotificationPermission,
  getRecordatorioContenido,
} from '../utils/audioAlert';

export interface ActiveAlarm {
  recordatorio: Recordatorio;
  horaActivacion: string;
  timestamp: number;
  esPrueba?: boolean;
}

interface ReminderContextType {
  recordatorios: Recordatorio[];
  loading: boolean;
  activeAlarm: ActiveAlarm | null;
  desktopPermission: NotificationPermission | 'unsupported';
  horaLimaActual: string;
  reloadRecordatorios: () => Promise<void>;
  dismissAlarm: () => void;
  snoozeAlarm: (minutos?: number) => void;
  triggerTestAlarm: (recordatorio?: Recordatorio) => void;
  requestPermission: () => Promise<NotificationPermission>;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{
  children: React.ReactNode;
  onNavigateTab?: (tab: string) => void;
}> = ({ children, onNavigateTab }) => {
  const { user } = useAuth();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [horaLimaActual, setHoraLimaActual] = useState<string>('--:--');
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  // Claves de alarmas disparadas hoy para evitar duplicados en el mismo minuto
  const firedMapRef = useRef<Set<string>>(new Set());
  // Almacén de pospuestos (recordatorio_id -> timestamp en que debe volver a sonar)
  const snoozedUntilRef = useRef<Map<number, number>>(new Map());

  const fetchRecordatorios = useCallback(async () => {
    if (!user || user.rol !== 'TITULAR') {
      setRecordatorios([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/recordatorios');
      if (res.data.success) {
        setRecordatorios(res.data.data);
      }
    } catch (err) {
      console.warn('[ReminderContext] Error al cargar recordatorios:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecordatorios();
  }, [fetchRecordatorios]);

  // Actualizar permiso si el usuario lo concede
  const requestPermission = async (): Promise<NotificationPermission> => {
    const result = await requestDesktopNotificationPermission();
    setDesktopPermission(result);
    return result;
  };

  const dispararAlarma = useCallback(
    (recordatorio: Recordatorio, hora: string, esPrueba = false) => {
      const contenido = getRecordatorioContenido(recordatorio.tipo_aviso);

      // 1. Sonido Web Audio
      playReminderChime();

      // 2. Notificación del sistema operativo / navegador
      sendDesktopNotification(
        `⏰ Recordatorio: ${contenido.titulo} (${hora})`,
        `${contenido.descripcion} - ${contenido.consejo}`,
        () => {
          if (onNavigateTab) {
            if (
              recordatorio.destino_tipo === 'REGISTRO_ACTIVIDAD' ||
              recordatorio.destino_tipo === 'REGISTRO_CONTACTO' ||
              recordatorio.destino_tipo === 'CONFIRMACION_DIARIA'
            ) {
              onNavigateTab('habitos');
            } else if (recordatorio.destino_tipo === 'CONTROL_PROGRAMADO') {
              onNavigateTab('controles');
            }
          }
        }
      );

      // 3. Modal / Toast flotante en pantalla
      setActiveAlarm({
        recordatorio,
        horaActivacion: hora,
        timestamp: Date.now(),
        esPrueba,
      });
    },
    [onNavigateTab]
  );

  const triggerTestAlarm = useCallback(
    (recordatorioPersonalizado?: Recordatorio) => {
      const target =
        recordatorioPersonalizado ||
        recordatorios[0] || {
          recordatorio_id: 9999,
          tipo_aviso: 'ACTIVIDAD_FISICA',
          hora_programada: horaLimaActual !== '--:--' ? horaLimaActual : '10:00',
          dias_semana: 'L,M,X,J,V,S,D',
          estado: 'ACTIVO',
          destino_tipo: 'REGISTRO_ACTIVIDAD',
        };

      dispararAlarma(target as Recordatorio, horaLimaActual, true);
    },
    [recordatorios, horaLimaActual, dispararAlarma]
  );

  const dismissAlarm = useCallback(() => {
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback(
    (minutos = 5) => {
      if (!activeAlarm) return;
      const id = activeAlarm.recordatorio.recordatorio_id;
      const reviveAt = Date.now() + minutos * 60 * 1000;
      snoozedUntilRef.current.set(id, reviveAt);
      setActiveAlarm(null);
    },
    [activeAlarm]
  );

  // Motor Ticker en tiempo real: revisa cada 3 segundos
  useEffect(() => {
    if (!user || user.rol !== 'TITULAR') return;

    const interval = setInterval(() => {
      const now = new Date();

      // 1. Hora oficial en Perú (America/Lima)
      let limaHHMM = '00:00';
      let limaDayLetter = 'L';
      let fechaHoyStr = '';

      try {
        const parts = new Intl.DateTimeFormat('es-PE', {
          timeZone: 'America/Lima',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(now);

        const h = parts.find((p) => p.type === 'hour')?.value || '00';
        const m = parts.find((p) => p.type === 'minute')?.value || '00';
        const y = parts.find((p) => p.type === 'year')?.value || '2026';
        const mo = parts.find((p) => p.type === 'month')?.value || '01';
        const d = parts.find((p) => p.type === 'day')?.value || '01';

        limaHHMM = `${h}:${m}`;
        fechaHoyStr = `${y}-${mo}-${d}`;

        const weekday = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Lima',
          weekday: 'short',
        }).format(now);

        const dayMap: Record<string, string> = {
          Sun: 'D',
          Mon: 'L',
          Tue: 'M',
          Wed: 'X',
          Thu: 'J',
          Fri: 'V',
          Sat: 'S',
        };
        limaDayLetter = dayMap[weekday] || 'L';
      } catch {
        // Fallback si no soporta timeZone
        const lh = String(now.getHours()).padStart(2, '0');
        const lm = String(now.getMinutes()).padStart(2, '0');
        limaHHMM = `${lh}:${lm}`;
        const fallbackDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        limaDayLetter = fallbackDays[now.getDay()];
        fechaHoyStr = now.toISOString().split('T')[0];
      }

      setHoraLimaActual(limaHHMM);

      // Si ya hay una alarma visible en pantalla, no sobreescribirla
      if (activeAlarm) return;

      // 2. Verificar recordatorios pospuestos
      const currentTimeMs = Date.now();
      for (const [id, reviveAt] of snoozedUntilRef.current.entries()) {
        if (currentTimeMs >= reviveAt) {
          snoozedUntilRef.current.delete(id);
          const r = recordatorios.find((item) => item.recordatorio_id === id);
          if (r && r.estado === 'ACTIVO') {
            dispararAlarma(r, limaHHMM, false);
            return;
          }
        }
      }

      // 3. Revisar cada recordatorio activo
      for (const r of recordatorios) {
        if (r.estado !== 'ACTIVO') continue;

        // Validar día de la semana
        const diasConfigurados = r.dias_semana.split(',').map((d) => d.trim().toUpperCase());
        const coincideDia = diasConfigurados.includes(limaDayLetter);

        if (!coincideDia) continue;

        // Normalizar hora programada (HH:mm)
        const horaProgramadaHHMM = r.hora_programada.slice(0, 5);

        // Clave única para evitar repetir dentro del mismo minuto
        const fireKey = `${user.persona_id}_${r.recordatorio_id}_${fechaHoyStr}_${horaProgramadaHHMM}`;

        // Comprobar si ya fue disparado hoy
        if (firedMapRef.current.has(fireKey)) continue;

        // Comprobar coincidencia exacta de hora o tolerancia de 1 minuto si acaba de sincronizar
        const [progH, progM] = horaProgramadaHHMM.split(':').map(Number);
        const [curH, curM] = limaHHMM.split(':').map(Number);
        const diffMinutes = (curH * 60 + curM) - (progH * 60 + progM);

        if (diffMinutes >= 0 && diffMinutes <= 1) {
          firedMapRef.current.add(fireKey);
          dispararAlarma(r, horaProgramadaHHMM, false);
          break;
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, recordatorios, activeAlarm, dispararAlarma]);

  return (
    <ReminderContext.Provider
      value={{
        recordatorios,
        loading,
        activeAlarm,
        desktopPermission,
        horaLimaActual,
        reloadRecordatorios: fetchRecordatorios,
        dismissAlarm,
        snoozeAlarm,
        triggerTestAlarm,
        requestPermission,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminders must be used within a ReminderProvider');
  return context;
};
