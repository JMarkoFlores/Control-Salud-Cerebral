import { getPool, sql } from '../config/database';

export class RecordatorioRepository {
  async getRecordatorios(personaId: number): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .query(`
        SELECT recordatorio_id, persona_id, tipo_aviso,
               CONVERT(VARCHAR(5), hora_programada, 108) AS hora_programada,
               dias_semana, estado, destino_tipo, destino_registro_id, fecha_creacion
        FROM recordatorio
        WHERE persona_id = @persona_id
        ORDER BY hora_programada ASC
      `);
    return res.recordset;
  }

  async createRecordatorio(data: {
    persona_id: number;
    tipo_aviso: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL' | 'CONTROL_SALUD' | 'CONFIRMACION_DIARIA';
    hora_programada: string;
    dias_semana: string;
    destino_tipo: 'REGISTRO_ACTIVIDAD' | 'REGISTRO_CONTACTO' | 'CONFIRMACION_DIARIA' | 'CONTROL_PROGRAMADO' | 'META_SEMANAL';
    destino_registro_id?: number | null;
  }): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('tipo_aviso', sql.VarChar(30), data.tipo_aviso)
      .input('hora_programada', sql.VarChar(10), data.hora_programada)
      .input('dias_semana', sql.VarChar(25), data.dias_semana)
      .input('destino_tipo', sql.VarChar(30), data.destino_tipo)
      .input('destino_registro_id', sql.Int, data.destino_registro_id ?? null)
      .query(`
        INSERT INTO recordatorio (
          persona_id, tipo_aviso, hora_programada, dias_semana,
          estado, destino_tipo, destino_registro_id, fecha_creacion
        )
        OUTPUT INSERTED.recordatorio_id
        VALUES (
          @persona_id, @tipo_aviso, @hora_programada, @dias_semana,
          'ACTIVO', @destino_tipo, @destino_registro_id, GETDATE()
        )
      `);
    return res.recordset[0].recordatorio_id;
  }

  async toggleEstado(recordatorioId: number, personaId: number, nuevoEstado: 'ACTIVO' | 'PAUSADO'): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('recordatorio_id', sql.Int, recordatorioId)
      .input('persona_id', sql.Int, personaId)
      .input('estado', sql.VarChar(15), nuevoEstado)
      .query(`
        UPDATE recordatorio
        SET estado = @estado
        WHERE recordatorio_id = @recordatorio_id AND persona_id = @persona_id
      `);
    return res.rowsAffected[0] > 0;
  }

  async deleteRecordatorio(recordatorioId: number, personaId: number): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('recordatorio_id', sql.Int, recordatorioId)
      .input('persona_id', sql.Int, personaId)
      .query(`
        DELETE FROM recordatorio
        WHERE recordatorio_id = @recordatorio_id AND persona_id = @persona_id
      `);
    return res.rowsAffected[0] > 0;
  }
}
