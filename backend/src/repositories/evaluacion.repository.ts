import { getPool, sql } from '../config/database';

export class EvaluacionRepository {
  async getUltimaEvaluacion(personaId: number): Promise<any | null> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .query(`
        SELECT TOP 1 evaluacion_id, persona_id, fecha_evaluacion, periodo_referencia,
               puntaje_total, puntaje_actividad, puntaje_social, puntaje_cardiometabolico,
               categoria_riesgo, version_algoritmo
        FROM evaluacion_salud_cerebral
        WHERE persona_id = @persona_id
        ORDER BY fecha_evaluacion DESC, evaluacion_id DESC
      `);
    return res.recordset[0] || null;
  }

  async saveEvaluacion(data: {
    persona_id: number;
    periodo_referencia: string;
    puntaje_total: number;
    puntaje_actividad: number;
    puntaje_social: number;
    puntaje_cardiometabolico: number;
    categoria_riesgo: 'BAJO' | 'MODERADO' | 'ALTO';
    version_algoritmo?: string;
  }): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('periodo_referencia', sql.VarChar(20), data.periodo_referencia)
      .input('puntaje_total', sql.Numeric(5, 2), data.puntaje_total)
      .input('puntaje_actividad', sql.Numeric(5, 2), data.puntaje_actividad)
      .input('puntaje_social', sql.Numeric(5, 2), data.puntaje_social)
      .input('puntaje_cardiometabolico', sql.Numeric(5, 2), data.puntaje_cardiometabolico)
      .input('categoria_riesgo', sql.VarChar(20), data.categoria_riesgo)
      .input('version_algoritmo', sql.VarChar(20), data.version_algoritmo || 'v1.0')
      .query(`
        INSERT INTO evaluacion_salud_cerebral (
          persona_id, fecha_evaluacion, periodo_referencia, puntaje_total,
          puntaje_actividad, puntaje_social, puntaje_cardiometabolico,
          categoria_riesgo, version_algoritmo
        )
        OUTPUT INSERTED.evaluacion_id
        VALUES (
          @persona_id, GETDATE(), @periodo_referencia, @puntaje_total,
          @puntaje_actividad, @puntaje_social, @puntaje_cardiometabolico,
          @categoria_riesgo, @version_algoritmo
        )
      `);
    return res.recordset[0].evaluacion_id;
  }
}
