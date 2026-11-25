import { getPool, sql } from '../config/database';
import { parseToDate, formatToSqlDateTime } from '../utils/dateUtils';

export class ControlRepository {
  async getControlesProgramadosMes(personaId: number, mesPeriodo: string): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('mes_periodo', sql.Date, mesPeriodo)
      .query(`
        SELECT 
          c.control_id,
          c.persona_id,
          c.tipo_control,
          CONVERT(VARCHAR(10), c.mes_periodo, 120) AS mes_periodo,
          CONVERT(VARCHAR(10), c.fecha_prevista, 120) AS fecha_prevista,
          c.criterio_meta_texto,
          c.valor_meta_min,
          c.valor_meta_max,
          c.valor_meta_max_diast,
          c.unidad,
          c.vigente,
          r.resultado_id,
          CONVERT(VARCHAR(19), r.fecha_medicion, 120) AS fecha_medicion,
          r.valor_numerico,
          r.valor_sistolica,
          r.valor_diastolica,
          r.es_referencia,
          r.dentro_de_meta
        FROM control_programado c
        LEFT JOIN resultado_control r 
          ON c.control_id = r.control_id AND r.es_referencia = 1
        WHERE c.persona_id = @persona_id 
          AND c.mes_periodo = @mes_periodo 
          AND c.vigente = 1
        ORDER BY c.tipo_control
      `);
    return res.recordset;
  }

  async createControlProgramado(data: {
    persona_id: number;
    tipo_control: 'Presión arterial' | 'Glucosa' | 'Colesterol LDL' | 'IMC';
    mes_periodo: string;
    fecha_prevista: string;
    criterio_meta_texto: string;
    valor_meta_min?: number;
    valor_meta_max?: number;
    valor_meta_max_diast?: number;
    unidad: string;
  }): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('tipo_control', sql.VarChar(30), data.tipo_control)
      .input('mes_periodo', sql.Date, data.mes_periodo)
      .input('fecha_prevista', sql.Date, data.fecha_prevista)
      .input('criterio_meta_texto', sql.VarChar(80), data.criterio_meta_texto)
      .input('valor_meta_min', sql.Numeric(6, 2), data.valor_meta_min ?? null)
      .input('valor_meta_max', sql.Numeric(6, 2), data.valor_meta_max ?? null)
      .input('valor_meta_max_diast', sql.Numeric(6, 2), data.valor_meta_max_diast ?? null)
      .input('unidad', sql.VarChar(20), data.unidad)
      .query(`
        INSERT INTO control_programado (
          persona_id, tipo_control, mes_periodo, fecha_prevista,
          criterio_meta_texto, valor_meta_min, valor_meta_max, valor_meta_max_diast, unidad, vigente
        )
        OUTPUT INSERTED.control_id
        VALUES (
          @persona_id, @tipo_control, @mes_periodo, @fecha_prevista,
          @criterio_meta_texto, @valor_meta_min, @valor_meta_max, @valor_meta_max_diast, @unidad, 1
        )
      `);
    return res.recordset[0].control_id;
  }

  async getResultadosPorControl(controlId: number): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('control_id', sql.Int, controlId)
      .query(`
        SELECT resultado_id, control_id, persona_id, tipo_control,
               CONVERT(VARCHAR(19), fecha_medicion, 120) AS fecha_medicion,
               valor_numerico, valor_sistolica, valor_diastolica, unidad, origen,
               validado, es_referencia, dentro_de_meta
        FROM resultado_control
        WHERE control_id = @control_id
        ORDER BY fecha_medicion DESC
      `);
    return res.recordset;
  }

  async getHistorialResultados(personaId: number, limit: number = 50): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          r.resultado_id,
          r.control_id,
          r.persona_id,
          r.tipo_control,
          CONVERT(VARCHAR(19), r.fecha_medicion, 120) AS fecha_medicion,
          r.valor_numerico,
          r.valor_sistolica,
          r.valor_diastolica,
          r.unidad,
          r.origen,
          r.validado,
          r.es_referencia,
          r.dentro_de_meta,
          c.criterio_meta_texto,
          CONVERT(VARCHAR(10), c.mes_periodo, 120) AS mes_periodo
        FROM resultado_control r
        LEFT JOIN control_programado c ON r.control_id = c.control_id
        WHERE r.persona_id = @persona_id
        ORDER BY r.fecha_medicion DESC
      `);
    return res.recordset;
  }

  async insertResultadoControl(data: {
    control_id?: number | null;
    persona_id: number;
    tipo_control: 'Presión arterial' | 'Glucosa' | 'Colesterol LDL' | 'IMC';
    fecha_medicion: string;
    valor_numerico?: number | null;
    valor_sistolica?: number | null;
    valor_diastolica?: number | null;
    unidad: string;
    origen: 'Autorreporte' | 'Dispositivo' | 'Laboratorio' | 'Otro';
    es_referencia?: boolean;
    dentro_de_meta?: boolean | null;
  }): Promise<number> {
    const pool = await getPool();

    // Si se marca como referencia y tiene control_id, desmarcar otras referencias previas de ese control
    if (data.control_id && data.es_referencia) {
      await pool.request()
        .input('control_id', sql.Int, data.control_id)
        .query(`UPDATE resultado_control SET es_referencia = 0 WHERE control_id = @control_id`);
    }

    const formatted = formatToSqlDateTime(data.fecha_medicion);
    const res = await pool.request()
      .input('control_id', sql.Int, data.control_id ?? null)
      .input('persona_id', sql.Int, data.persona_id)
      .input('tipo_control', sql.VarChar(30), data.tipo_control)
      .input('fecha_medicion', sql.DateTime2, formatted)
      .input('valor_numerico', sql.Numeric(6, 2), data.valor_numerico ?? null)
      .input('valor_sistolica', sql.Numeric(5, 1), data.valor_sistolica ?? null)
      .input('valor_diastolica', sql.Numeric(5, 1), data.valor_diastolica ?? null)
      .input('unidad', sql.VarChar(20), data.unidad)
      .input('origen', sql.VarChar(25), data.origen)
      .input('es_referencia', sql.Bit, data.es_referencia ? 1 : 0)
      .input('dentro_de_meta', sql.Bit, data.dentro_de_meta === null || data.dentro_de_meta === undefined ? null : (data.dentro_de_meta ? 1 : 0))
      .query(`
        INSERT INTO resultado_control (
          control_id, persona_id, tipo_control, fecha_medicion,
          valor_numerico, valor_sistolica, valor_diastolica, unidad,
          origen, validado, es_referencia, dentro_de_meta
        )
        OUTPUT INSERTED.resultado_id
        VALUES (
          @control_id, @persona_id, @tipo_control, @fecha_medicion,
          @valor_numerico, @valor_sistolica, @valor_diastolica, @unidad,
          @origen, 1, @es_referencia, @dentro_de_meta
        )
      `);

    return res.recordset[0].resultado_id;
  }
}
