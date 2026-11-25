import cron from 'node-cron';
import { AlertaService } from '../services/alerta.service';

export function startAlertCronJobs(): void {
  const alertaService = new AlertaService();

  // 1. Tarea Diaria a las 08:00 AM (Zona horaria America/Lima): Motivación y recordatorios del día
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Ejecutando revisión matutina de hábitos y motivación diaria...');
    try {
      const res = await alertaService.ejecutarMotorAlertas();
      console.log('[CRON Matutino] Resultado:', res);
    } catch (err: any) {
      console.error('[CRON Matutino Error]:', err.message);
    }
  }, {
    timezone: 'America/Lima',
  });

  // 2. Tarea Diaria a las 21:00 PM: Verificación de confirmaciones pendientes del día
  cron.schedule('0 21 * * *', async () => {
    console.log('[CRON] Ejecutando verificación nocturna de hábitos no confirmados...');
    try {
      const res = await alertaService.ejecutarMotorAlertas();
      console.log('[CRON Nocturno] Resultado:', res);
    } catch (err: any) {
      console.error('[CRON Nocturno Error]:', err.message);
    }
  }, {
    timezone: 'America/Lima',
  });

  // 3. Tarea Semanal los Domingos a las 23:30 PM: Cierre semanal y alertas de cumplimiento
  cron.schedule('30 23 * * 0', async () => {
    console.log('[CRON] Ejecutando cierre semanal y evaluación de metas...');
    try {
      const res = await alertaService.ejecutarMotorAlertas();
      console.log('[CRON Semanal Domingo] Resultado:', res);
    } catch (err: any) {
      console.error('[CRON Semanal Error]:', err.message);
    }
  }, {
    timezone: 'America/Lima',
  });

  console.log('⏰ Motor automático de tareas cron activado (Zona: America/Lima).');
}
