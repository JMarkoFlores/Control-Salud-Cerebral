import { getPool, sql } from '../config/database';

export class SimulacionRepository {
  async getSimulaciones(personaId: number): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .query(`
        SELECT simulacion_id, persona_id, evaluacion_base_id, nombre_escenario,
               minutos_simulados_sem, dias_contacto_simulados, factores_controlados_sim,
               puntaje_proyectado, riesgo_10_anios_pct, riesgo_20_anios_pct, fecha_simulacion
        FROM simulacion_riesgo
        WHERE persona_id = @persona_id
        ORDER BY fecha_simulacion DESC
      `);
    return res.recordset;
  }

  async saveSimulacion(data: {
    persona_id: number;
    evaluacion_base_id?: number | null;
    nombre_escenario: string;
    minutos_simulados_sem: number;
    dias_contacto_simulados: number;
    factores_controlados_sim: number;
    puntaje_proyectado: number;
    riesgo_10_anios_pct: number;
    riesgo_20_anios_pct: number;
  }): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, data.persona_id)
      .input('evaluacion_base_id', sql.Int, data.evaluacion_base_id ?? null)
      .input('nombre_escenario', sql.VarChar(80), data.nombre_escenario)
      .input('minutos_simulados_sem', sql.Int, data.minutos_simulados_sem)
      .input('dias_contacto_simulados', sql.Int, data.dias_contacto_simulados)
      .input('factores_controlados_sim', sql.Int, data.factores_controlados_sim)
      .input('puntaje_proyectado', sql.Numeric(5, 2), data.puntaje_proyectado)
      .input('riesgo_10_anios_pct', sql.Numeric(5, 2), data.riesgo_10_anios_pct)
      .input('riesgo_20_anios_pct', sql.Numeric(5, 2), data.riesgo_20_anios_pct)
      .query(`
        INSERT INTO simulacion_riesgo (
          persona_id, evaluacion_base_id, nombre_escenario,
          minutos_simulados_sem, dias_contacto_simulados, factores_controlados_sim,
          puntaje_proyectado, riesgo_10_anios_pct, riesgo_20_anios_pct, fecha_simulacion
        )
        OUTPUT INSERTED.simulacion_id
        VALUES (
          @persona_id, @evaluacion_base_id, @nombre_escenario,
          @minutos_simulados_sem, @dias_contacto_simulados, @factores_controlados_sim,
          @puntaje_proyectado, @riesgo_10_anios_pct, @riesgo_20_anios_pct, GETDATE()
        )
      `);
    return res.recordset[0].simulacion_id;
  }
}
