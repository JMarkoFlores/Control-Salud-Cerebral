import { getPool, sql } from '../config/database';

export class LogroRepository {
  async getCatalogo(soloActivos: boolean = true): Promise<any[]> {
    const pool = await getPool();
    let query = `SELECT logro_id, codigo_logro, nombre, descripcion, activo FROM catalogo_logro`;
    if (soloActivos) {
      query += ` WHERE activo = 1`;
    }
    query += ` ORDER BY logro_id ASC`;
    const res = await pool.request().query(query);
    return res.recordset;
  }

  async getLogrosPorPersona(personaId: number): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .query(`
        SELECT 
          c.logro_id,
          c.codigo_logro,
          c.nombre,
          c.descripcion,
          c.activo,
          o.logro_obtenido_id,
          o.periodo_referencia,
          o.fecha_obtencion,
          CASE WHEN o.logro_obtenido_id IS NOT NULL THEN 1 ELSE 0 END AS desbloqueado
        FROM catalogo_logro c
        LEFT JOIN logro_obtenido o 
          ON c.logro_id = o.logro_id AND o.persona_id = @persona_id
        WHERE c.activo = 1
        ORDER BY c.logro_id ASC
      `);
    return res.recordset;
  }

  async otorgarLogroSiNoExiste(personaId: number, codigoLogro: string, periodoReferencia: string): Promise<boolean> {
    const pool = await getPool();

    // Obtener id del logro
    const catRes = await pool.request()
      .input('codigo', sql.VarChar(40), codigoLogro)
      .query(`SELECT logro_id FROM catalogo_logro WHERE codigo_logro = @codigo AND activo = 1`);

    if (catRes.recordset.length === 0) return false;
    const logroId = catRes.recordset[0].logro_id;

    // Verificar si ya fue obtenido para este periodo
    const checkRes = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('logro_id', sql.Int, logroId)
      .input('periodo', sql.VarChar(20), periodoReferencia)
      .query(`
        SELECT 1 
        FROM logro_obtenido 
        WHERE persona_id = @persona_id AND logro_id = @logro_id AND periodo_referencia = @periodo
      `);

    if (checkRes.recordset.length > 0) return false;

    // Insertar
    await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('logro_id', sql.Int, logroId)
      .input('periodo', sql.VarChar(20), periodoReferencia)
      .query(`
        INSERT INTO logro_obtenido (persona_id, logro_id, periodo_referencia, fecha_obtencion)
        VALUES (@persona_id, @logro_id, @periodo, GETDATE())
      `);

    return true;
  }

  async toggleCatalogoLogro(logroId: number, activo: boolean): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('logro_id', sql.Int, logroId)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query(`UPDATE catalogo_logro SET activo = @activo WHERE logro_id = @logro_id`);
    return res.rowsAffected[0] > 0;
  }
}
