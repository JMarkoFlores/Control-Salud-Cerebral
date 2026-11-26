import { getPool } from '../config/database';

async function cleanupDuplicates() {
  const pool = await getPool();
  console.log('--- 1. Conteo antes de limpiar ---');
  const countBefore = await pool.request().query('SELECT COUNT(*) as total FROM evaluacion_salud_cerebral');
  console.log('Total registros antes:', countBefore.recordset[0].total);

  console.log('--- 2. Eliminando registros duplicados dejando el más reciente ---');
  const query = `
    WITH CTE_Duplicados AS (
      SELECT evaluacion_id,
             ROW_NUMBER() OVER (
               PARTITION BY persona_id, periodo_referencia
               ORDER BY evaluacion_id DESC
             ) AS rn
      FROM evaluacion_salud_cerebral
    )
    DELETE FROM evaluacion_salud_cerebral
    WHERE evaluacion_id IN (
      SELECT evaluacion_id FROM CTE_Duplicados WHERE rn > 1
    );
  `;
  const delRes = await pool.request().query(query);
  console.log('Registros duplicados eliminados:', delRes.rowsAffected);

  console.log('--- 3. Conteo después de limpiar ---');
  const countAfter = await pool.request().query('SELECT COUNT(*) as total FROM evaluacion_salud_cerebral');
  console.log('Total registros después:', countAfter.recordset[0].total);

  const restantes = await pool.request().query(`
    SELECT evaluacion_id, persona_id, fecha_evaluacion, periodo_referencia,
           puntaje_total, puntaje_actividad, puntaje_social, puntaje_cardiometabolico, categoria_riesgo
    FROM evaluacion_salud_cerebral
    ORDER BY persona_id, periodo_referencia;
  `);
  console.log('Registros únicos preservados:', restantes.recordset);

  console.log('--- 4. Creando índice único si no existe ---');
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes 
      WHERE name = 'uq_evaluacion_persona_periodo' AND object_id = OBJECT_ID('evaluacion_salud_cerebral')
    )
    BEGIN
      CREATE UNIQUE INDEX uq_evaluacion_persona_periodo
      ON evaluacion_salud_cerebral (persona_id, periodo_referencia);
      PRINT 'Índice único uq_evaluacion_persona_periodo creado con éxito.';
    END
    ELSE
    BEGIN
      PRINT 'El índice único uq_evaluacion_persona_periodo ya existe.';
    END
  `);
  console.log('Índice único verificado en la base de datos.');

  process.exit(0);
}

cleanupDuplicates().catch((err) => {
  console.error('Error en cleanup:', err);
  process.exit(1);
});
