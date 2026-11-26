/**
 * audioAlert.ts
 * Utilidad de audio con sintetizador Web Audio API y gestión de notificaciones de escritorio HTML5.
 */

export function playReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Acorde armónico ascendente de campana cristalina (C5 -> E5 -> G5 -> C6)
    const tones = [
      { freq: 523.25, time: 0.0, dur: 0.4 },
      { freq: 659.25, time: 0.12, dur: 0.5 },
      { freq: 783.99, time: 0.24, dur: 0.6 },
      { freq: 1046.5, time: 0.36, dur: 0.9 },
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Envolvente acústica: ataque rápido y caída suave
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    console.warn('[AudioAlert] No se pudo reproducir el sonido (restricción del navegador):', err);
  }
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export function sendDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'salud-cerebral-recordatorio',
      requireInteraction: true,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (err) {
    console.warn('[DesktopNotification] Error al emitir notificación:', err);
  }
}

export function getRecordatorioContenido(tipo: string): { titulo: string; descripcion: string; consejo: string } {
  switch (tipo) {
    case 'ACTIVIDAD_FISICA':
      return {
        titulo: 'Actividad Física',
        descripcion: '¡Es hora de tu caminata, ejercicio o deporte programado!',
        consejo: '30 minutos de movimiento moderado aumentan el flujo sanguíneo cerebral y estimulan la neurogénesis.',
      };
    case 'CONTACTO_SOCIAL':
      return {
        titulo: 'Contacto Social',
        descripcion: '¡Es momento de tu llamada, visita o charla con amigos/familiares!',
        consejo: 'La interacción social significativa previene el aislamiento y fortalece las reservas cognitivas.',
      };
    case 'CONFIRMACION_DIARIA':
      return {
        titulo: 'Confirmación Diaria',
        descripcion: '¡Es hora de registrar tus hábitos completados del día!',
        consejo: 'Confirmar tus días antes de dormir mantiene tu racha protegida y actualiza tu puntaje de salud cerebral.',
      };
    case 'CONTROL_SALUD':
      return {
        titulo: 'Control de Salud',
        descripcion: '¡Tienes un control preventivo programado (Presión, Glucosa, etc.)!',
        consejo: 'Monitorear tus indicadores cardiometabólicos a tiempo protege los vasos sanguíneos cerebrales.',
      };
    default:
      return {
        titulo: tipo.replace('_', ' '),
        descripcion: '¡Tienes un aviso de salud programado para este momento!',
        consejo: 'La constancia en tus hábitos es la clave para la prevención del deterioro cognitivo.',
      };
  }
}
