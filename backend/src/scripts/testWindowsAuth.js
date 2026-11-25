const sql = require('mssql/msnodesqlv8');

async function test() {
  console.log('Probando conexión con Windows Authentication nativa...');

  const config = {
    connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=.;Database=prevencion_cognitiva_oltp;Trusted_Connection=yes;TrustServerCertificate=yes;',
  };

  try {
    const pool = await new sql.ConnectionPool(config).connect();
    console.log('✅ CONEXIÓN EXITOSA con Autenticación de Windows!');

    const res = await pool.request().query('SELECT @@SERVERNAME AS Servidor, DB_NAME() AS BaseDeDatos, SUSER_SNAME() AS UsuarioWindows;');
    console.log('Datos de conexión:', res.recordset[0]);

    const countRes = await pool.request().query(`
      SELECT COUNT(*) AS totalTablas
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = 'prevencion_cognitiva_oltp';
    `);
    console.log('Tablas detectadas en prevencion_cognitiva_oltp:', countRes.recordset[0].totalTablas);

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error de conexión:', err);
    process.exit(1);
  }
}

test();
