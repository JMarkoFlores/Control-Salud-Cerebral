import { AlertaRepository } from '../repositories/alerta.repository';
import { HabitoRepository } from '../repositories/habito.repository';
import { ControlRepository } from '../repositories/control.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { getMondayOfCurrentWeek, getSundayOfCurrentWeek, getFirstDayOfMonth, getTodayString, formatDateYMD } from '../utils/dateUtils';

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
      let ejecucionId: number | null = null;
      try {
        ejecucionId = await this.alertaRepo.registrarEjecucion(regla.regla_id, 'EXITOSO', 0);
        let generadas = 0;
        switch (regla.codigo_regla) {
          case 'REG-01':
            generadas = await this.ejecutarRegla01(regla.regla_id, ejecucionId);
            break;
          case 'REG-02':
            generadas = await this.ejecutarRegla02(regla.regla_id, ejecucionId);
            break;
          case 'REG-03':
            generadas = await this.ejecutarRegla03(regla.regla_id, ejecucionId);
            break;
          case 'REG-04':
            generadas = await this.ejecutarRegla04(regla.regla_id, ejecucionId);
            break;
        }

        await this.alertaRepo.actualizarEjecucion(ejecucionId, 'EXITOSO', generadas);
        totalGeneradas += generadas;
        detalles.push({ codigo_regla: regla.codigo_regla, generadas, estado: 'EXITOSO' });
      } catch (err: any) {
        console.error(`Error en regla ${regla.codigo_regla}:`, err.message);
        if (ejecucionId) {
          await this.alertaRepo.actualizarEjecucion(ejecucionId, 'ERROR', 0);
        } else {
          await this.alertaRepo.registrarEjecucion(regla.regla_id, 'ERROR', 0);
        }
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
      const hoy = getTodayString();
      const periodoHoy = `D-${hoy}`;

      // Regla 04: Motivación diaria si hoy no tiene actividad física
      const sesionesHoy = await this.habitoRepo.getSesionesFisicas(personaId, hoy, hoy, true);
      if (sesionesHoy.length === 0) {
        // Encontrar regla REG-04
        const reglas = await this.alertaRepo.getReglas();
        const regla04 = reglas.find(r => r.codigo_regla === 'REG-04');
        if (regla04 && regla04.activa) {
          const ejecId = await this.alertaRepo.registrarEjecucion(regla04.regla_id, 'EXITOSO', 1);
          await this.alertaRepo.insertarAlertaSiNoExiste({
            persona_id: personaId,
            regla_id: regla04.regla_id,
            ejecucion_id: ejecId,
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
  private async ejecutarRegla01(reglaId: number, ejecucionId: number): Promise<number> {
    const monday = getMondayOfCurrentWeek();
    const hoy = getTodayString();
    let contador = 0;

    // Buscar titulares activos
    const pool = await (await import('../config/database')).getPool();
    const res = await pool.request().query("SELECT persona_id FROM persona WHERE activo = 1 AND codigo_interno <> 'P-000'");

    for (const row of res.recordset) {
      const personaId = row.persona_id;
      const confirmaciones = await this.habitoRepo.getConfirmacionesSemana(personaId, monday, hoy);
      const confSet = new Set(confirmaciones.map(c => c.fecha));

      // Si ayer no está confirmado
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const ayerStr = formatDateYMD(ayer);

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
            ejecucion_id: ejecucionId,
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
  private async ejecutarRegla02(reglaId: number, ejecucionId: number): Promise<number> {
    const monday = getMondayOfCurrentWeek();
    const sunday = getSundayOfCurrentWeek(monday);
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
          const sesiones = await this.habitoRepo.getSesionesFisicas(personaId, monday, sunday, true);
          const totalMinutos = sesiones.reduce((sum, s) => sum + s.duracion_minutos, 0);

          // Coherencia: Solo emitir si NO ha alcanzado su meta semanal de minutos
          if (totalMinutos < meta.valor_meta) {
            const faltan = meta.valor_meta - totalMinutos;
            const inserted = await this.alertaRepo.insertarAlertaSiNoExiste({
              persona_id: personaId,
              regla_id: reglaId,
              ejecucion_id: ejecucionId,
              tipo_seguimiento: 'ACTIVIDAD_FISICA',
              periodo_referencia: `W-${monday}`,
              motivo: 'Meta semanal sin alcanzar',
              mensaje: `Estás cerca del cierre semanal. Llevas ${totalMinutos} de ${meta.valor_meta} min. Te faltan ${faltan} min para alcanzar tu meta.`,
              destinatario_cuenta_id: cuentaId,
              rol_destinatario: 'TITULAR',
            });
            if (inserted) contador++;
          }
        }
      }
    }
    return contador;
  }

  /**
   * REG-03: Control vencido sin resultado
   */
  private async ejecutarRegla03(reglaId: number, ejecucionId: number): Promise<number> {
    const primerDiaMes = getFirstDayOfMonth();
    const hoy = getTodayString();
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
        ejecucion_id: ejecucionId,
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
  private async ejecutarRegla04(reglaId: number, ejecucionId: number): Promise<number> {
    const hoy = getTodayString();
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
          ejecucion_id: ejecucionId,
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

  /**
   * Genera alerta motivadora inmediata al registrar actividad física
   */
  async generarAlertaMotivacionActividad(
    personaId: number,
    cuentaId: number,
    minutos: number,
    tipoActividad: string,
    sesionId: number
  ): Promise<void> {
    try {
      const reglas = await this.alertaRepo.getReglas();
      const regla04 = reglas.find(r => r.codigo_regla === 'REG-04');
      if (!regla04 || !regla04.activa) return;

      const ejecId = await this.alertaRepo.registrarEjecucion(regla04.regla_id, 'EXITOSO', 1);
      const periodoRef = `SES-${sesionId}`.slice(0, 20);

      // Obtener avance semanal actual
      const monday = getMondayOfCurrentWeek();
      const meta = await this.habitoRepo.getMetaVigente(personaId, 'ACTIVIDAD_FISICA', monday);
      let mensaje = `¡Felicitaciones por haber realizado ${minutos} min de ${tipoActividad.toLowerCase()}! Sigue así para que logres tu meta semanal y fortalezcas tu memoria.`;

      if (meta) {
        const sunday = getSundayOfCurrentWeek(monday);
        const sesiones = await this.habitoRepo.getSesionesFisicas(personaId, monday, sunday, true);
        const totalMin = sesiones.reduce((sum, s) => sum + s.duracion_minutos, 0);
        if (totalMin >= meta.valor_meta) {
          mensaje = `¡Felicitaciones! Has completado ${minutos} min de ${tipoActividad.toLowerCase()} y alcanzaste tu meta semanal (${totalMin}/${meta.valor_meta} min). ¡Excelente constancia para tu cerebro!`;
        } else {
          const faltan = meta.valor_meta - totalMin;
          mensaje = `¡Felicitaciones por haber hecho ${minutos} min de ${tipoActividad.toLowerCase()}! Llevas ${totalMin} de ${meta.valor_meta} min. Sigue así para que logres tu meta semanal (te faltan ${faltan} min).`;
        }
      }

      await this.alertaRepo.insertarAlertaSiNoExiste({
        persona_id: personaId,
        regla_id: regla04.regla_id,
        ejecucion_id: ejecId,
        tipo_seguimiento: 'ACTIVIDAD_FISICA',
        periodo_referencia: periodoRef,
        motivo: 'Motivación diaria',
        mensaje: mensaje.slice(0, 250),
        destinatario_cuenta_id: cuentaId,
        rol_destinatario: 'TITULAR',
      });
    } catch (e: any) {
      console.warn('[AlertaService] Error al generar motivación de actividad:', e.message);
    }
  }

  /**
   * Genera alerta motivadora inmediata al registrar interacción social
   */
  async generarAlertaMotivacionSocial(
    personaId: number,
    cuentaId: number,
    modalidad: string,
    contactoId: number
  ): Promise<void> {
    try {
      const reglas = await this.alertaRepo.getReglas();
      const regla04 = reglas.find(r => r.codigo_regla === 'REG-04');
      if (!regla04 || !regla04.activa) return;

      const ejecId = await this.alertaRepo.registrarEjecucion(regla04.regla_id, 'EXITOSO', 1);
      const periodoRef = `SOC-${contactoId}`.slice(0, 20);

      // Obtener avance semanal actual
      const monday = getMondayOfCurrentWeek();
      const meta = await this.habitoRepo.getMetaVigente(personaId, 'CONTACTO_SOCIAL', monday);
      let mensaje = `¡Felicitaciones por registrar tu interacción social (${modalidad})! Mantener el contacto con amigos y familia nutre tus redes neuronales.`;

      if (meta) {
        const sunday = getSundayOfCurrentWeek(monday);
        const contactos = await this.habitoRepo.getContactosSociales(personaId, monday, sunday, true);
        const fechasUnicas = new Set(contactos.map(c => typeof c.fecha_hora === 'string' ? c.fecha_hora.slice(0, 10) : formatDateYMD(c.fecha_hora)));
        const diasConContacto = fechasUnicas.size;
        if (diasConContacto >= meta.valor_meta) {
          mensaje = `¡Felicitaciones! Registraste tu contacto social (${modalidad}) y cumpliste tu meta de la semana (${diasConContacto}/${meta.valor_meta} días). ¡Tus lazos protegen tu salud cerebral!`;
        } else {
          const faltan = meta.valor_meta - diasConContacto;
          mensaje = `¡Felicitaciones por registrar tu interacción social (${modalidad})! Llevas ${diasConContacto} de ${meta.valor_meta} días. Sigue así para que logres tu meta semanal (te falta ${faltan} día).`;
        }
      }

      await this.alertaRepo.insertarAlertaSiNoExiste({
        persona_id: personaId,
        regla_id: regla04.regla_id,
        ejecucion_id: ejecId,
        tipo_seguimiento: 'CONTACTO_SOCIAL',
        periodo_referencia: periodoRef,
        motivo: 'Motivación diaria',
        mensaje: mensaje.slice(0, 250),
        destinatario_cuenta_id: cuentaId,
        rol_destinatario: 'TITULAR',
      });
    } catch (e: any) {
      console.warn('[AlertaService] Error al generar motivación social:', e.message);
    }
  }
}
