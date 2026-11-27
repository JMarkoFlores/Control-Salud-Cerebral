import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database';

/**
 * Refresco manual del Data Mart dimensional.
 * Ejecuta los pasos 03 y 04 del ETL (dimensiones y hechos) sobre la BD transaccional.
 * Los scripts se montan en la imagen (carpeta bd-dim-sql) para no duplicar la lógica T-SQL.
 */
const SCRIPT_SEQUENCE = ['02_ETL.sql'];
const MART_DATABASE = 'prevencion_cognitiva_mart';
const STATEMENT_TIMEOUT_MS = 180000;

let isRunning = false;

export interface DataMartRefreshResult {
  ejecutadoEn: string;
  duracionMs: number;
  scripts: Array<{ script: string; duracionMs: number }>;
  filas: { habitos: number; controles: number };
  fechaCorte: string | null;
}

function scriptsDirectory(): string {
  return process.env.DATAMART_SCRIPTS_DIR || path.resolve(__dirname, '../../../bd-dim-sql');
}

/** Divide el script por lotes GO y descarta los `USE`, porque la conexión ya apunta a la BD transaccional. */
function loadBatches(fileName: string): string[] {
  const content = fs.readFileSync(path.join(scriptsDirectory(), fileName), 'utf-8');
  return content
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0 && !/^USE\s/i.test(batch));
}

async function assertDataMartExists(): Promise<void> {
  const pool = await getPool();
  const result = await pool.request().query(`SELECT DB_ID(N'${MART_DATABASE}') AS id_mart`);
  if (!result.recordset[0]?.id_mart) {
    const error: any = new Error(
      'El Data Mart no está inicializado. Ejecuta los scripts de bd-dim-sql/01 a 02 antes del primer refresco.'
    );
    error.statusCode = 409;
    error.code = 'DATA_MART_NO_INICIALIZADO';
    throw error;
  }
}

export async function refreshDataMart(): Promise<DataMartRefreshResult> {
  if (isRunning) {
    const error: any = new Error('Ya hay un refresco del Data Mart en curso. Espera a que termine.');
    error.statusCode = 409;
    error.code = 'ETL_EN_PROGRESO';
    throw error;
  }

  isRunning = true;
  const startedAt = Date.now();

  try {
    await assertDataMartExists();
    const pool = await getPool();
    const scripts: Array<{ script: string; duracionMs: number }> = [];

    for (const script of SCRIPT_SEQUENCE) {
      const scriptStartedAt = Date.now();
      for (const batch of loadBatches(script)) {
        const request = pool.request();
        request.timeout = STATEMENT_TIMEOUT_MS;
        await request.batch(batch);
      }
      scripts.push({ script, duracionMs: Date.now() - scriptStartedAt });
    }

    const counts = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM [${MART_DATABASE}].[dbo].[FACT_HABITOS_SEMANALES]) AS habitos,
        (SELECT COUNT(*) FROM [${MART_DATABASE}].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]) AS controles,
        (SELECT MAX(fecha_corte) FROM [${MART_DATABASE}].[dbo].[FACT_HABITOS_SEMANALES]) AS fecha_corte
    `);
    const row = counts.recordset[0];

    return {
      ejecutadoEn: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      duracionMs: Date.now() - startedAt,
      scripts,
      filas: { habitos: row?.habitos ?? 0, controles: row?.controles ?? 0 },
      fechaCorte: row?.fecha_corte ? new Date(row.fecha_corte).toISOString().slice(0, 10) : null,
    };
  } finally {
    isRunning = false;
  }
}
