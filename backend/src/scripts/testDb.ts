import { getPool, sql } from '../config/database';
import { env } from '../config/env';
import { TABLES_PREVENCION_17 } from '../config/constants';

async function testDatabase() {
  console.log('=============================================================');
  console.log('VERIFICACIÓN DE CONEXIÓN A BASE DE DATOS (SQL SERVER)');
  console.log('Base de Datos:', env.DB.database);
  console.log('Servidor:', env.DB.server);
  console.log('Autenticación:', env.DB.authType === 'windows' ? 'Windows Authentication (Integrada)' : `SQL Server (${env.DB.user})`);
  console.log('=============================================================\n');

  try {
    const pool = await getPool();
    console.log('✅ Conexión exitosa con el servidor SQL Server.\n');

    // Consultar las tablas existentes en la base de datos
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = '${env.DB.database}';
    `);

    const existingTables = new Set(result.recordset.map((r: any) => r.TABLE_NAME.toLowerCase()));

    console.log('--- Verificación de las 17 tablas transaccionales ---');
    let missingCount = 0;

    for (const table of TABLES_PREVENCION_17) {
      if (existingTables.has(table.toLowerCase())) {
        // Consultar conteo de registros
        const countRes = await pool.request().query(`SELECT COUNT(*) AS total FROM [${table}];`);
        const total = countRes.recordset[0]?.total || 0;
        console.log(`  [OK] Tabla '${table.padEnd(26)}' accesible. Registros: ${total}`);
      } else {
        console.error(`  [X]  Tabla '${table.padEnd(26)}' NO ENCONTRADA.`);
        missingCount++;
      }
    }

    console.log('\n-------------------------------------------------------------');
    if (missingCount === 0) {
      console.log('🎉 ¡EXCELENTE! Las 17 tablas de prevencion_cognitiva_oltp están 100% verificadas.');
    } else {
      console.warn(`⚠️ Atención: Faltan ${missingCount} tablas. Asegúrate de haber ejecutado bd-transaccional.sql en SSMS.`);
    }
    console.log('-------------------------------------------------------------\n');

    await pool.close();
    process.exit(missingCount === 0 ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ ERROR AL CONECTAR CON SQL SERVER:');
    console.error('Mensaje:', error.message);
    console.error('\nCONSEJOS DE CONFIGURACIÓN:');
    console.error('1. Verifica que el servicio de SQL Server esté INICIADO en tu PC (services.msc).');
    console.error('2. Verifica en SQL Server Configuration Manager que TCP/IP esté HABILITADO en el puerto 1433.');
    console.error('3. Comprueba tus credenciales en backend/.env (DB_SERVER, DB_USER, DB_PASSWORD).');
    console.error('4. Si usas instancia nombrada, prueba: DB_SERVER=localhost\\\\SQLEXPRESS o DB_SERVER=localhost.');
    console.error('5. Asegúrate de haber creado la BD ejecutando bd-transaccional.sql en SSMS.\n');
    process.exit(1);
  }
}

testDatabase();
