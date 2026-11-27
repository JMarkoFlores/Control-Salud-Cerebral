import sql from 'mssql';
import { env } from './env';

let pool: any = null;

export async function getPool(): Promise<any> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    if (pool) await pool.close();

    if (env.DB.authType === 'windows') {
      // Conexión nativa con Autenticación Integrada de Windows (SSPI/ODBC)
      const sqlV8 = require('mssql/msnodesqlv8');
      const connStr = `Driver=${env.DB.driver};Server=${env.DB.server};Database=${env.DB.database};Trusted_Connection=yes;TrustServerCertificate=yes;`;

      pool = await new sqlV8.ConnectionPool({
        connectionString: connStr,
        driver: 'msnodesqlv8',
      }).connect();
    } else {
      // Conexión por SQL Server Authentication (sa / password con tedious)
      const sqlConfig: sql.config = {
        server: env.DB.server,
        port: env.DB.port,
        database: env.DB.database,
        user: env.DB.user,
        password: env.DB.password,
        options: {
          encrypt: env.DB.encrypt,
          trustServerCertificate: env.DB.trustServerCertificate,
          connectTimeout: env.DB.connectionTimeout,
          requestTimeout: env.DB.requestTimeout,
        },
        pool: {
          max: 15,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      };

      pool = await new sql.ConnectionPool(sqlConfig).connect();
    }

    pool.on('error', (err: any) => {
      console.error('[DB Pool Error]', err);
    });

    return pool;
  } catch (err: any) {
    console.error('[DB Connection Failed]', {
      server: env.DB.server,
      authType: env.DB.authType,
      database: env.DB.database,
      user: env.DB.authType === 'windows' ? '(Autenticación de Windows)' : env.DB.user,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Ejecuta una consulta parametrizada de manera segura
 */
export async function executeQuery<T = any>(
  queryText: string,
  params?: Record<string, { type: sql.ISqlType | (() => sql.ISqlType); value: any }>
): Promise<sql.IResult<T>> {
  const p = await getPool();
  const request = p.request();

  if (params) {
    for (const [key, param] of Object.entries(params)) {
      request.input(key, param.type, param.value);
    }
  }

  return await (request as sql.Request).query<T>(queryText);
}

export { sql };
