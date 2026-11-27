import sql from 'mssql';
import { env } from '../config/env';
import { SqlServerRepository } from '../repositories/sqlserver';
import { emptyFilters } from '../utils/filters';
import { aggregate } from '../utils/calc';
import { IndicatorCode } from '../types';

function assertEqual(name: string, actual: number, expected: number): void {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(`${name}: API ${actual}, vista directa ${expected}`);
  }
}

async function main(): Promise<void> {
  if (env.DATA_SOURCE !== 'sqlserver') {
    throw new Error('Ejecute con DATA_SOURCE=sqlserver.');
  }

  const repository = new SqlServerRepository();
  const directPool = await new sql.ConnectionPool({
    server: env.BI_DB_SERVER!,
    port: env.BI_DB_PORT,
    database: env.BI_DB_DATABASE,
    user: env.BI_DB_USER!,
    password: env.BI_DB_PASSWORD!,
    connectionTimeout: env.QUERY_TIMEOUT_MS,
    requestTimeout: env.QUERY_TIMEOUT_MS,
    options: {
      encrypt: env.BI_DB_ENCRYPT,
      trustServerCertificate: env.BI_DB_TRUST_SERVER_CERTIFICATE,
      enableArithAbort: true
    }
  }).connect();

  try {
    const filters = emptyFilters();
    const [meta, weekly, fcm, controls, filterOptions] = await Promise.all([
      repository.getMeta(),
      repository.getWeeklyRows(filters),
      repository.getFcmRows(filters),
      repository.getControlRows(filters),
      repository.getFilterOptions(filters)
    ]);

    const direct = await directPool.request().query(`
      SELECT codigo_indicador,
             SUM(CASE WHEN es_evaluable = 1 THEN CONVERT(DECIMAL(38,2), numerador) END) AS numerador,
             SUM(CASE WHEN es_evaluable = 1 THEN CONVERT(DECIMAL(38,2), denominador) END) AS denominador,
             SUM(CASE WHEN es_evaluable = 1 THEN CONVERT(BIGINT, 1) ELSE CONVERT(BIGINT, 0) END) AS evaluables
      FROM [bi].[v_Indicadores]
      WHERE pais = N'Perú' AND en_rango_edad = 1
      GROUP BY codigo_indicador`);

    const directByCode = new Map<string, Record<string, unknown>>(
      (direct.recordset as Array<Record<string, unknown>>).map((row) => [String(row.codigo_indicador), row])
    );
    const rowsByCode: Record<IndicatorCode, Array<{ numerador: number | null; denominador: number | null; es_evaluable: number | boolean | null }>> = {
      CAF: weekly.filter((row) => row.codigo_indicador === 'CAF'),
      CCS: weekly.filter((row) => row.codigo_indicador === 'CCS'),
      FCM: fcm
    };

    for (const code of ['CAF', 'CCS', 'FCM'] as const) {
      const result = aggregate(rowsByCode[code], code);
      const expected = directByCode.get(code);
      if (!expected) {
        if (result.evaluables !== 0) throw new Error(`${code}: faltan filas en la vista consolidada.`);
        continue;
      }
      assertEqual(`${code} numerador`, result.numerator, Number(expected.numerador ?? 0));
      assertEqual(`${code} denominador`, result.denominator, Number(expected.denominador ?? 0));
      assertEqual(`${code} evaluables`, result.evaluables, Number(expected.evaluables ?? 0));
    }

    let directTableDenied = false;
    try {
      await directPool.request().query('SELECT TOP (1) key_persona FROM [dbo].[DIM_PERSONA]');
    } catch {
      directTableDenied = true;
    }
    if (!directTableDenied) throw new Error('El login BI puede leer DIM_PERSONA; se esperaba acceso denegado.');

    const closedControls = await repository.getControlRows({ ...filters, onlyClosed: true });
    if (closedControls.some((row) => row.periodo_cerrado !== 1)) {
      throw new Error('El filtro de periodos cerrados dejó pasar un control abierto.');
    }

    console.log(`SQL Server verificado · corte=${meta.fechaCorte ?? 'sin datos'} · CAF=${aggregate(rowsByCode.CAF, 'CAF').evaluables} · CCS=${aggregate(rowsByCode.CCS, 'CCS').evaluables} · FCM=${aggregate(rowsByCode.FCM, 'FCM').evaluables} evaluables`);
    console.log(`Filtros disponibles · años=${filterOptions.years.length} · distritos=${filterOptions.districts.length} · controles=${controls.length}`);
    console.log('Totales de API coinciden con [bi].[v_Indicadores]; lectura directa de dbo.DIM_PERSONA denegada.');
  } finally {
    await Promise.all([repository.close(), directPool.close()]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falló la verificación SQL Server.');
  process.exitCode = 1;
});
