import { getPool, sql } from '../config/database';
import { parseToDate, formatToSqlDateTime } from '../utils/dateUtils';

export class HabitoRepository {
  // ---------------------------------------------------------------------------
  // METAS SEMANALES
  // ---------------------------------------------------------------------------
  async getMetaVigente(personaId: number, habito: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL', inicioSemana: string): Promise<any | null> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('habito', sql.VarChar(25), habito)
      .input('inicio_semana', sql.Date, inicioSemana)
      .query(`
        SELECT TOP 1 meta_id, persona_id, habito, CONVERT(VARCHAR(10), inicio_semana, 120) AS inicio_semana,
               valor_meta, unidad, version_meta, origen_meta, vigente
        FROM meta_semanal
        WHERE persona_id = @persona_id AND habito = @habito AND inicio_semana <= @inicio_semana AND vigente = 1
        ORDER BY inicio_semana DESC, version_meta DESC
      `);
    return res.recordset[0] || null;
  }

  async getHistorialMetas(personaId: number, habito?: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL'): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request().input('persona_id', sql.Int, personaId);
    let query = `
      SELECT meta_id, persona_id, habito, CONVERT(VARCHAR(10), inicio_semana, 120) AS inicio_semana,
             valor_meta, unidad, version_meta, origen_meta, vigente, fecha_registro
      FROM meta_semanal
      WHERE persona_id = @persona_id
    `;
    if (habito) {
      req.input('habito', sql.VarChar(25), habito);
      query += ` AND habito = @habito`;
    }
    query += ` ORDER BY inicio_semana DESC, version_meta DESC`;
    const res = await req.query(query);
    return res.recordset;
  }

  async saveMetaSemanal(data: {
    persona_id: number;
    habito: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL';
    inicio_semana: string;
    valor_meta: number;
    unidad: 'MINUTOS' | 'DIAS';
    origen_meta: 'PERSONAL' | 'PROFESIONAL_SALUD' | 'ACORDADA';
  }): Promise<any> {
    const pool = await getPool();
    
    // Buscar la versión actual más alta
    const verRes = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('habito', sql.VarChar(25), data.habito)
      .input('inicio_semana', sql.Date, data.inicio_semana)
      .query(`
        SELECT ISNULL(MAX(version_meta), 0) AS max_version
        FROM meta_semanal
        WHERE persona_id = @persona_id AND habito = @habito AND inicio_semana = @inicio_semana
      `);

    const nextVersion = (verRes.recordset[0]?.max_version || 0) + 1;

    // Desactivar versiones previas vigentes para la misma semana
    await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('habito', sql.VarChar(25), data.habito)
      .input('inicio_semana', sql.Date, data.inicio_semana)
      .query(`
        UPDATE meta_semanal
        SET vigente = 0
        WHERE persona_id = @persona_id AND habito = @habito AND inicio_semana = @inicio_semana AND vigente = 1
      `);

    // Insertar nueva meta vigente
    const insertRes = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('habito', sql.VarChar(25), data.habito)
      .input('inicio_semana', sql.Date, data.inicio_semana)
      .input('valor_meta', sql.Int, data.valor_meta)
      .input('unidad', sql.VarChar(20), data.unidad)
      .input('version_meta', sql.Int, nextVersion)
      .input('origen_meta', sql.VarChar(30), data.origen_meta)
      .query(`
        INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
        OUTPUT INSERTED.meta_id, INSERTED.version_meta
        VALUES (@persona_id, @habito, @inicio_semana, @valor_meta, @unidad, @version_meta, @origen_meta, 1)
      `);

    return insertRes.recordset[0];
  }

  // ---------------------------------------------------------------------------
  // SESION FISICA
  // ---------------------------------------------------------------------------
  async getSesionesFisicas(personaId: number, fechaInicio: string, fechaFin: string, soloValidos: boolean = true): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('fecha_inicio', sql.DateTime2, `${fechaInicio} 00:00:00`)
      .input('fecha_fin', sql.DateTime2, `${fechaFin} 23:59:59`);

    let query = `
      SELECT sesion_id, persona_id, CONVERT(VARCHAR(19), fecha_hora, 120) AS fecha_hora,
             tipo_actividad, duracion_minutos, origen, estado
      FROM sesion_fisica
      WHERE persona_id = @persona_id
        AND fecha_hora >= @fecha_inicio
        AND fecha_hora <= @fecha_fin
    `;
    if (soloValidos) {
      query += ` AND estado = 'VALIDO'`;
    }
    query += ` ORDER BY fecha_hora DESC`;

    const res = await req.query(query);
    return res.recordset;
  }

  async insertSesionFisica(data: {
    persona_id: number;
    fecha_hora: string;
    tipo_actividad: 'Caminata' | 'Ejercicio' | 'Deporte' | 'Otro';
    duracion_minutos: number;
    origen: 'Autorreporte' | 'Dispositivo' | 'Otro';
  }): Promise<number> {
    const pool = await getPool();
    const formatted = formatToSqlDateTime(data.fecha_hora);
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('fecha_hora', sql.DateTime2, formatted)
      .input('tipo_actividad', sql.VarChar(40), data.tipo_actividad)
      .input('duracion_minutos', sql.Int, data.duracion_minutos)
      .input('origen', sql.VarChar(25), data.origen)
      .query(`
        INSERT INTO sesion_fisica (persona_id, fecha_hora, tipo_actividad, duracion_minutos, origen, estado)
        OUTPUT INSERTED.sesion_id
        VALUES (@persona_id, @fecha_hora, @tipo_actividad, @duracion_minutos, @origen, 'VALIDO')
      `);

    return res.recordset[0].sesion_id;
  }

  async anularSesionFisica(sesionId: number, personaId: number): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('sesion_id', sql.Int, sesionId)
      .input('persona_id', sql.Int, personaId)
      .query(`
        UPDATE sesion_fisica
        SET estado = 'ANULADO'
        WHERE sesion_id = @sesion_id AND persona_id = @persona_id
      `);
    return res.rowsAffected[0] > 0;
  }

  // ---------------------------------------------------------------------------
  // CONTACTO SOCIAL
  // ---------------------------------------------------------------------------
  async getContactosSociales(personaId: number, fechaInicio: string, fechaFin: string, soloValidos: boolean = true): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('fecha_inicio', sql.DateTime2, `${fechaInicio} 00:00:00`)
      .input('fecha_fin', sql.DateTime2, `${fechaFin} 23:59:59`);

    let query = `
      SELECT contacto_id, persona_id, CONVERT(VARCHAR(19), fecha_hora, 120) AS fecha_hora,
             modalidad, origen, estado
      FROM contacto_social
      WHERE persona_id = @persona_id
        AND fecha_hora >= @fecha_inicio
        AND fecha_hora <= @fecha_fin
    `;
    if (soloValidos) {
      query += ` AND estado = 'VALIDO'`;
    }
    query += ` ORDER BY fecha_hora DESC`;

    const res = await req.query(query);
    return res.recordset;
  }

  async insertContactoSocial(data: {
    persona_id: number;
    fecha_hora: string;
    modalidad: 'Llamadas' | 'Visita familiar' | 'Conversación presencial' | 'Videollamada' | 'Otro';
    origen: 'Autorreporte' | 'Dispositivo' | 'Otro';
  }): Promise<number> {
    const pool = await getPool();
    const formatted = formatToSqlDateTime(data.fecha_hora);
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('fecha_hora', sql.DateTime2, formatted)
      .input('modalidad', sql.VarChar(40), data.modalidad)
      .input('origen', sql.VarChar(25), data.origen)
      .query(`
        INSERT INTO contacto_social (persona_id, fecha_hora, modalidad, origen, estado)
        OUTPUT INSERTED.contacto_id
        VALUES (@persona_id, @fecha_hora, @modalidad, @origen, 'VALIDO')
      `);

    return res.recordset[0].contacto_id;
  }

  async anularContactoSocial(contactoId: number, personaId: number): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('contacto_id', sql.Int, contactoId)
      .input('persona_id', sql.Int, personaId)
      .query(`
        UPDATE contacto_social
        SET estado = 'ANULADO'
        WHERE contacto_id = @contacto_id AND persona_id = @persona_id
      `);
    return res.rowsAffected[0] > 0;
  }

  // ---------------------------------------------------------------------------
  // CONFIRMACION DIARIA
  // ---------------------------------------------------------------------------
  async getConfirmacionesSemana(personaId: number, fechaInicio: string, fechaFin: string): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('fecha_inicio', sql.Date, fechaInicio)
      .input('fecha_fin', sql.Date, fechaFin)
      .query(`
        SELECT confirmacion_id, persona_id, CONVERT(VARCHAR(10), fecha, 120) AS fecha,
               habito, estado_confirmacion, fecha_confirmacion
        FROM confirmacion_diaria
        WHERE persona_id = @persona_id AND fecha >= @fecha_inicio AND fecha <= @fecha_fin
      `);
    return res.recordset;
  }

  async upsertConfirmacionDiaria(data: {
    persona_id: number;
    fecha: string;
    habito: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL';
    estado_confirmacion: 'CONFIRMADO_CON_REGISTRO' | 'CONFIRMADO_SIN_ACTIVIDAD' | 'PENDIENTE';
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('fecha', sql.Date, data.fecha)
      .input('habito', sql.VarChar(25), data.habito)
      .input('estado', sql.VarChar(30), data.estado_confirmacion)
      .query(`
        MERGE confirmacion_diaria AS target
        USING (SELECT @persona_id AS persona_id, @fecha AS fecha, @habito AS habito) AS source
        ON (target.persona_id = source.persona_id AND target.fecha = source.fecha AND target.habito = source.habito)
        WHEN MATCHED THEN
          UPDATE SET estado_confirmacion = @estado, fecha_confirmacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (persona_id, fecha, habito, estado_confirmacion, fecha_confirmacion)
          VALUES (@persona_id, @fecha, @habito, @estado, GETDATE());
      `);
  }
}
