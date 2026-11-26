import { getPool, sql } from '../config/database';

export class AlertaRepository {
  async getAlertasPorCuenta(cuentaId: number, estado?: 'PENDIENTE' | 'ATENDIDA' | 'CERRADA'): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request().input('cuenta_id', sql.Int, cuentaId);
    let query = `
      SELECT 
        a.alerta_id,
        a.persona_id,
        a.regla_id,
        a.ejecucion_id,
        a.tipo_seguimiento,
        a.control_id,
        a.periodo_referencia,
        a.motivo,
        a.mensaje,
        a.destinatario_cuenta_id,
        a.rol_destinatario,
        a.estado,
        a.fecha_emision,
        a.fecha_atencion,
        r.nombre_regla,
        p.nombres AS titular_nombres,
        p.apellidos AS titular_apellidos,
        p.codigo_interno
      FROM alerta a
      INNER JOIN regla_alerta r ON a.regla_id = r.regla_id
      INNER JOIN persona p ON a.persona_id = p.persona_id
      WHERE a.destinatario_cuenta_id = @cuenta_id
    `;
    if (estado) {
      req.input('estado', sql.VarChar(20), estado);
      query += ` AND a.estado = @estado`;
    }
    query += ` ORDER BY a.fecha_emision DESC`;

    const res = await req.query(query);
    return res.recordset;
  }

  async getConteoPendientes(cuentaId: number): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('cuenta_id', sql.Int, cuentaId)
      .query(`
        SELECT COUNT(*) AS total
        FROM alerta
        WHERE destinatario_cuenta_id = @cuenta_id AND estado = 'PENDIENTE'
      `);
    return res.recordset[0]?.total || 0;
  }

  async marcarAtendida(alertaId: number, cuentaId: number): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('alerta_id', sql.Int, alertaId)
      .input('cuenta_id', sql.Int, cuentaId)
      .query(`
        UPDATE alerta
        SET estado = 'ATENDIDA', fecha_atencion = GETDATE()
        WHERE alerta_id = @alerta_id AND destinatario_cuenta_id = @cuenta_id
      `);
    return res.rowsAffected[0] > 0;
  }

  async getReglas(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT regla_id, codigo_regla, nombre_regla, version_regla, frecuencia, tipo_activacion, activa
      FROM regla_alerta
      ORDER BY regla_id ASC
    `);
    return res.recordset;
  }

  async toggleRegla(reglaId: number, activa: boolean): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('regla_id', sql.Int, reglaId)
      .input('activa', sql.Bit, activa ? 1 : 0)
      .query(`UPDATE regla_alerta SET activa = @activa WHERE regla_id = @regla_id`);
    return res.rowsAffected[0] > 0;
  }

  async registrarEjecucion(reglaId: number, estado: 'EXITOSO' | 'ERROR', alertasGeneradas: number): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('regla_id', sql.Int, reglaId)
      .input('resultado_estado', sql.VarChar(20), estado)
      .input('alertas_generadas', sql.Int, alertasGeneradas)
      .query(`
        INSERT INTO ejecucion_regla (regla_id, fecha_ejecucion, resultado_estado, alertas_generadas)
        OUTPUT INSERTED.ejecucion_id
        VALUES (@regla_id, GETDATE(), @resultado_estado, @alertas_generadas)
      `);
    return res.recordset[0].ejecucion_id;
  }

  async actualizarEjecucion(ejecucionId: number, estado: 'EXITOSO' | 'ERROR', alertasGeneradas: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('eid', sql.Int, ejecucionId)
      .input('estado', sql.VarChar(20), estado)
      .input('generadas', sql.Int, alertasGeneradas)
      .query(`
        UPDATE ejecucion_regla 
        SET resultado_estado = @estado, alertas_generadas = @generadas 
        WHERE ejecucion_id = @eid
      `);
  }

  async getHistorialEjecuciones(limit: number = 20): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          e.ejecucion_id,
          e.regla_id,
          e.fecha_ejecucion,
          e.resultado_estado,
          e.alertas_generadas,
          r.codigo_regla,
          r.nombre_regla
        FROM ejecucion_regla e
        INNER JOIN regla_alerta r ON e.regla_id = r.regla_id
        ORDER BY e.fecha_ejecucion DESC
      `);
    return res.recordset;
  }

  async insertarAlertaSiNoExiste(data: {
    persona_id: number;
    regla_id: number;
    ejecucion_id: number;
    tipo_seguimiento: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL' | 'CONTROL_CARDIOMETABOLICO';
    control_id?: number | null;
    periodo_referencia: string;
    motivo: 'Dato sin confirmar' | 'Meta semanal sin alcanzar' | 'Control vencido sin resultado' | 'Motivación diaria';
    mensaje?: string;
    destinatario_cuenta_id: number;
    rol_destinatario: 'TITULAR' | 'ADMIN';
  }): Promise<boolean> {
    const pool = await getPool();
    const cid = data.control_id ?? 0;

    // Verificar si ya existe por el índice único
    const check = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('regla_id', sql.Int, data.regla_id)
      .input('tipo_seguimiento', sql.VarChar(30), data.tipo_seguimiento)
      .input('control_id_unico', sql.Int, cid)
      .input('periodo_referencia', sql.VarChar(20), data.periodo_referencia)
      .input('destinatario_cuenta_id', sql.Int, data.destinatario_cuenta_id)
      .query(`
        SELECT 1 AS exists_flag
        FROM alerta
        WHERE persona_id = @persona_id
          AND regla_id = @regla_id
          AND tipo_seguimiento = @tipo_seguimiento
          AND control_id_unico = @control_id_unico
          AND periodo_referencia = @periodo_referencia
          AND destinatario_cuenta_id = @destinatario_cuenta_id
      `);

    if (check.recordset.length > 0) {
      return false; // Ya existe, no duplicar
    }

    await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('regla_id', sql.Int, data.regla_id)
      .input('ejecucion_id', sql.Int, data.ejecucion_id)
      .input('tipo_seguimiento', sql.VarChar(30), data.tipo_seguimiento)
      .input('control_id', sql.Int, data.control_id ?? null)
      .input('periodo_referencia', sql.VarChar(20), data.periodo_referencia)
      .input('motivo', sql.VarChar(60), data.motivo)
      .input('mensaje', sql.VarChar(250), data.mensaje || null)
      .input('destinatario_cuenta_id', sql.Int, data.destinatario_cuenta_id)
      .input('rol_destinatario', sql.VarChar(20), data.rol_destinatario)
      .query(`
        INSERT INTO alerta (
          persona_id, regla_id, ejecucion_id, tipo_seguimiento, control_id,
          periodo_referencia, motivo, mensaje, destinatario_cuenta_id,
          rol_destinatario, estado, fecha_emision
        )
        VALUES (
          @persona_id, @regla_id, @ejecucion_id, @tipo_seguimiento, @control_id,
          @periodo_referencia, @motivo, @mensaje, @destinatario_cuenta_id,
          @rol_destinatario, 'PENDIENTE', GETDATE()
        )
      `);

    return true;
  }
}
