import { AlertaRepository } from '../repositories/alerta.repository';
import { HabitoRepository } from '../repositories/habito.repository';
import { ControlRepository } from '../repositories/control.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { getMondayOfCurrentWeek, getFirstDayOfMonth } from '../utils/dateUtils';

export class AlertaService {
  private alertaRepo = new AlertaRepository();
  private habitoRepo = new HabitoRepository();
  private controlRepo = new ControlRepository();
  private authRepo = new AuthRepository();

  /**
   * Ejecuta el motor completo de reglas de alerta
   */
  async ejecutarMotorAlertas(): Promise<{ totalGeneradas: number; detalles: any[] }> {
    const reglas = await this.alertaRepo.getReglas();
    const reglasActivas = reglas.filter(r => r.activa);
    let totalGeneradas = 0;
    const detalles: any[] = [];

    for (const regla of reglasActivas) {
      try {
        let generadas = 0;
        switch (regla.codigo_regla) {
          case 'REG-01':
            generadas = await this.ejecutarRegla01(regla.regla_id);
            break;
          case 'REG-02':
            generadas = await this.ejecutarRegla02(regla.regla_id);
            break;
          case 'REG-03':
            generadas = await this.ejecutarRegla03(regla.regla_id);
            break;
          case 'REG-04':
            generadas = await this.ejecutarRegla04(regla.regla_id);
            break;
        }

        await this.alertaRepo.registrarEjecucion(regla.regla_id, 'EXITOSO', generadas);
        totalGeneradas += generadas;
        detalles.push({ codigo_regla: regla.codigo_regla, generadas, estado: 'EXITOSO' });
      } catch (err: any) {
        console.error(`Error en regla ${regla.codigo_regla}:`, err.message);
        await this.alertaRepo.registrarEjecucion(regla.regla_id, 'ERROR', 0);
        detalles.push({ codigo_regla: regla.codigo_regla, generadas: 0, estado: 'ERROR', error: err.message });
      }
    }

    return { totalGeneradas, detalles };
  }

  /**
   * Verificación ligera al iniciar sesión el usuario (asegura datos en vivo)
   */
  async verificarAlertasAlLogin(personaId: number, cuentaId: number): Promise<void> {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const periodoHoy = `D-${hoy}`;

      // Regla 04: Motivación diaria si hoy no tiene actividad física
      const sesionesHoy = await this.habitoRepo.getSesionesFisicas(personaId, hoy, hoy, true);
      if (sesionesHoy.length === 0) {
        // Encontrar regla REG-04
        const reglas = await this.alertaRepo.getReglas();
        const regla04 = reglas.find(r => r.codigo_regla === 'REG-04');
        if (regla04 && regla04.activa) {
          await this.alertaRepo.insertarAlertaSiNoExiste({
            persona_id: personaId,
            regla_id: regla04.regla_id,
            ejecucion_id: 1, // ejecución base
            tipo_seguimiento: 'ACTIVIDAD_FISICA',
            periodo_referencia: periodoHoy,
            motivo: 'Motivación diaria',
            mensaje: '¡Hola! Recuerda que 20 minutos de caminata hoy activan tu memoria y protegen tus neuronas. ¡Tú puedes!',
            destinatario_cuenta_id: cuentaId,
            rol_destinatario: 'TITULAR',
          });
        }
      }
    } catch (e: any) {
      console.warn('[AlertaService] Aviso en verificación de login:', e.message);
    }
  }

  /**
   * REG-01: Datos de hábito sin confirmar
   */
  private async ejecutarRegla01(reglaId: number): Promise<number> {
    const monday = getMondayOfCurrentWeek();
    const hoy = new Date().toISOString().split('T')[0];
    let contador = 0;

    // Buscar titulares activos
    const titulares = await this.authRepo.findByEmail('carlos.mendoza@gmail.com'); // sample search or all
    // Para generalizar, consultamos titulares en la BD
    const pool = await (await import('../config/database')).getPool();
    const res = await pool.request().query("SELECT persona_id FROM persona WHERE activo = 1 AND codigo_interno <> 'P-000'");

    for (const row of res.recordset) {
      const personaId = row.persona_id;
      const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, monday, hoy);
      const confSet = new Set(confirmaciones.map(c => c.fecha));

      // Si ayer no está confirmado
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const ayerStr = ayer.toISOString().split('T')[0];

      if (ayerStr >= monday && !confSet.has(ayerStr)) {
        // Encontrar cuenta titular
        const accRes = await pool.request()
          .input('pid', (await import('../config/database')).sql.Int, personaId)
          .query("SELECT cuenta_id FROM cuenta_rol WHERE persona_titular_id = @pid AND rol = 'TITULAR'");

        if (accRes.recordset.length > 0) {
          const cuentaId = accRes.recordset[0].cuenta_id;
          const inserted = await this.alertaRepo.insertarAlertaSiNoExiste({
            persona_id: personaId,
            regla_id: reglaId,
            ejecucion_id: 1,
            tipo_seguimiento: 'ACTIVIDAD_FISICA',
            periodo_referencia: `CONF-${ayerStr}`,
            motivo: 'Dato sin confirmar',
            mensaje: `Tienes el registro del día de ayer (${ayerStr}) sin confirmar. Ingresa a tu panel de hábitos.`,
            destinatario_cuenta_id: cuentaId,
            rol_destinatario: 'TITULAR',
          });
          if (inserted) contador++;
        }
      }
    }

    return contador;
  }

  /**
   * REG-02: Meta semanal sin alcanzar al cierre
   */
  private async ejecutarRegla02(reglaId: number): Promise<number> {
    const monday = getMondayOfCurrentWeek();
    let contador = 0;
    const pool = await (await import('../config/database')).getPool();
    const res = await pool.request().query("SELECT persona_id FROM persona WHERE activo = 1 AND codigo_interno <> 'P-000'");

    for (const row of res.recordset) {
      const personaId = row.persona_id;
      const accRes = await pool.request()
        .input('pid', (await import('../config/database')).sql.Int, personaId)
        .query("SELECT cuenta_id FROM cuenta_rol WHERE persona_titular_id = @pid AND rol = 'TITULAR'");

      if (accRes.recordset.length > 0) {
        const cuentaId = accRes.recordset[0].cuenta_id;
        const meta = await this.habitoRepo.getMetaVigente(personaId, 'ACTIVIDAD_FISICA', monday);
        if (meta) {
          const inserted = await this.alertaRepo.insertarAlertaSiNoExiste({
            persona_id: personaId,
            regla_id: reglaId,
            ejecucion_id: 1,
            tipo_seguimiento: 'ACTIVIDAD_FISICA',
            periodo_referencia: `W-${monday}`,
            motivo: 'Meta semanal sin alcanzar',
            mensaje: 'Estás cerca del cierre semanal. Recuerda registrar tus minutos para alcanzar tu meta.',
            destinatario_cuenta_id: cuentaId,
            rol_destinatario: 'TITULAR',
          });
          if (inserted) contador++;
        }
      }
    }
    return contador;
  }

  /**
   * REG-03: Control vencido sin resultado
   */
  private async ejecutarRegla03(reglaId: number): Promise<number> {
    const primerDiaMes = getFirstDayOfMonth();
    const hoy = new Date().toISOString().split('T')[0];
    let contador = 0;
    const pool = await (await import('../config/database')).getPool();

    const res = await pool.request()
      .input('primer_dia', (await import('../config/database')).sql.Date, primerDiaMes)
      .input('hoy', (await import('../config/database')).sql.Date, hoy)
      .query(`
        SELECT c.control_id, c.persona_id, c.tipo_control, CONVERT(VARCHAR(10), c.fecha_prevista, 120) AS fecha_prevista,
               cr.cuenta_id
        FROM control_programado c
        INNER JOIN cuenta_rol cr ON c.persona_id = cr.persona_titular_id AND cr.rol = 'TITULAR'
        LEFT JOIN resultado_control r ON c.control_id = r.control_id
        WHERE c.mes_periodo = @primer_dia 
          AND c.fecha_prevista < @hoy 
          AND r.resultado_id IS NULL
          AND c.vigente = 1
      `);

    for (const row of res.recordset) {
      const inserted = await this.alertaRepo.insertarAlertaSiNoExiste({
        persona_id: row.persona_id,
        regla_id: reglaId,
        ejecucion_id: 1,
        tipo_seguimiento: 'CONTROL_CARDIOMETABOLICO',
        control_id: row.control_id,
        periodo_referencia: `CTRL-${row.control_id}`,
        motivo: 'Control vencido sin resultado',
        mensaje: `Tu control de ${row.tipo_control} previsto para el ${row.fecha_prevista} está pendiente de resultado.`,
        destinatario_cuenta_id: row.cuenta_id,
        rol_destinatario: 'TITULAR',
      });
      if (inserted) contador++;
    }

    return contador;
  }

  /**
   * REG-04: Motivación diaria
   */
  private async ejecutarRegla04(reglaId: number): Promise<number> {
    const hoy = new Date().toISOString().split('T')[0];
    let contador = 0;
    const pool = await (await import('../config/database')).getPool();

    const res = await pool.request().query(`
      SELECT p.persona_id, cr.cuenta_id, p.nombres
      FROM persona p
      INNER JOIN cuenta_rol cr ON p.persona_id = cr.persona_titular_id AND cr.rol = 'TITULAR'
      WHERE p.activo = 1 AND p.codigo_interno <> 'P-000'
    `);

    for (const row of res.recordset) {
      const sesiones = await this.habitoRepo.getSesionesFisicas(row.persona_id, hoy, hoy, true);
      if (sesiones.length === 0) {
        const inserted = await this.alertaRepo.insertarAlertaSiNoExiste({
          persona_id: row.persona_id,
          regla_id: reglaId,
          ejecucion_id: 1,
          tipo_seguimiento: 'ACTIVIDAD_FISICA',
          periodo_referencia: `D-${hoy}`,
          motivo: 'Motivación diaria',
          mensaje: `¡Hola ${row.nombres}! Una caminata hoy por Trujillo le dará energía a tu cerebro y mantendrá tu puntaje alto.`,
          destinatario_cuenta_id: row.cuenta_id,
          rol_destinatario: 'TITULAR',
        });
        if (inserted) contador++;
      }
    }

    return contador;
  }
}
