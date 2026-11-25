import { getPool, sql } from '../config/database';

export class AdminRepository {
  async getGlobalStats(): Promise<any> {
    const pool = await getPool();

    // 1. Usuarios activos
    const usersRes = await pool.request().query(`
      SELECT 
        COUNT(CASE WHEN p.activo = 1 THEN 1 END) AS total_titulares,
        COUNT(c.cuenta_id) AS total_cuentas,
        COUNT(CASE WHEN c.rol = 'ACOMPANANTE' THEN 1 END) AS total_acompanantes
      FROM persona p
      LEFT JOIN cuenta_rol c ON p.persona_id = c.persona_titular_id
    `);

    // 2. Alertas
    const alertsRes = await pool.request().query(`
      SELECT 
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) AS total_pendientes,
        COUNT(CASE WHEN estado = 'ATENDIDA' THEN 1 END) AS total_atendidas
      FROM alerta
    `);

    // 3. Evaluaciones y promedio de puntaje
    const evalRes = await pool.request().query(`
      SELECT 
        AVG(puntaje_total) AS promedio_salud_cerebral,
        AVG(puntaje_actividad) AS promedio_caf,
        AVG(puntaje_social) AS promedio_ccs,
        AVG(puntaje_cardiometabolico) AS promedio_fcm
      FROM evaluacion_salud_cerebral
    `);

    return {
      usuarios: usersRes.recordset[0] || {},
      alertas: alertsRes.recordset[0] || {},
      promedios: evalRes.recordset[0] || {},
    };
  }

  async getUsuarios(filtros?: { rol?: string; distrito?: string; activo?: boolean }): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request();
    let query = `
      SELECT 
        p.persona_id,
        p.codigo_interno,
        p.nombres,
        p.apellidos,
        CONVERT(VARCHAR(10), p.fecha_nacimiento, 120) AS fecha_nacimiento,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad,
        p.sexo,
        p.activo,
        u.distrito,
        c.cuenta_id,
        c.correo_acceso,
        c.rol,
        c.autorizado,
        c.nombre_contacto,
        c.parentesco
      FROM persona p
      LEFT JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
      LEFT JOIN cuenta_rol c ON p.persona_id = c.persona_titular_id
      WHERE 1 = 1
    `;

    if (filtros?.rol) {
      req.input('rol', sql.VarChar(20), filtros.rol);
      query += ` AND c.rol = @rol`;
    }
    if (filtros?.distrito) {
      req.input('distrito', sql.VarChar(80), filtros.distrito);
      query += ` AND u.distrito = @distrito`;
    }
    if (filtros?.activo !== undefined) {
      req.input('activo', sql.Bit, filtros.activo ? 1 : 0);
      query += ` AND p.activo = @activo`;
    }

    query += ` ORDER BY p.persona_id DESC`;
    const res = await req.query(query);
    return res.recordset;
  }

  async getUbicaciones(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT ubicacion_id, pais, departamento, provincia, distrito
      FROM ubicacion
      ORDER BY distrito ASC
    `);
    return res.recordset;
  }

  // Reporte Semanal de Actividad Física
  async getReporteSemanalActividad(inicioSemana?: string): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request();
    let query = `
      SELECT 
        p.codigo_interno,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad,
        u.distrito,
        CONVERT(VARCHAR(10), m.inicio_semana, 120) AS inicio_semana,
        m.valor_meta AS meta_minutos,
        ISNULL(SUM(CASE WHEN s.estado = 'VALIDO' THEN s.duracion_minutos ELSE 0 END), 0) AS minutos_logrados,
        -- Verificación de confirmaciones pendientes
        (SELECT COUNT(*) 
         FROM confirmacion_diaria cd 
         WHERE cd.persona_id = p.persona_id 
           AND cd.habito = 'ACTIVIDAD_FISICA' 
           AND cd.estado_confirmacion = 'PENDIENTE'
           AND cd.fecha >= m.inicio_semana 
           AND cd.fecha <= DATEADD(day, 6, m.inicio_semana)
        ) AS dias_pendientes
      FROM persona p
      INNER JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
      INNER JOIN meta_semanal m ON p.persona_id = m.persona_id AND m.habito = 'ACTIVIDAD_FISICA' AND m.vigente = 1
      LEFT JOIN sesion_fisica s 
        ON p.persona_id = s.persona_id 
        AND s.fecha_hora >= CAST(m.inicio_semana AS DATETIME2)
        AND s.fecha_hora <= DATEADD(second, -1, CAST(DATEADD(day, 7, m.inicio_semana) AS DATETIME2))
      WHERE p.activo = 1 AND p.codigo_interno <> 'P-000'
    `;

    if (inicioSemana) {
      req.input('inicio_semana', sql.Date, inicioSemana);
      query += ` AND m.inicio_semana = @inicio_semana`;
    }

    query += `
      GROUP BY p.persona_id, p.codigo_interno, p.fecha_nacimiento, u.distrito, m.inicio_semana, m.valor_meta
      ORDER BY p.codigo_interno ASC, m.inicio_semana DESC
    `;

    const res = await req.query(query);
    return res.recordset;
  }

  // Reporte Semanal de Contacto Social
  async getReporteSemanalSocial(inicioSemana?: string): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request();
    let query = `
      SELECT 
        p.codigo_interno,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad,
        u.distrito,
        CONVERT(VARCHAR(10), m.inicio_semana, 120) AS inicio_semana,
        m.valor_meta AS meta_dias,
        COUNT(DISTINCT CASE WHEN c.estado = 'VALIDO' THEN CAST(c.fecha_hora AS DATE) END) AS dias_con_contacto,
        (SELECT COUNT(*) 
         FROM confirmacion_diaria cd 
         WHERE cd.persona_id = p.persona_id 
           AND cd.habito = 'CONTACTO_SOCIAL' 
           AND cd.estado_confirmacion = 'PENDIENTE'
           AND cd.fecha >= m.inicio_semana 
           AND cd.fecha <= DATEADD(day, 6, m.inicio_semana)
        ) AS dias_pendientes
      FROM persona p
      INNER JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
      INNER JOIN meta_semanal m ON p.persona_id = m.persona_id AND m.habito = 'CONTACTO_SOCIAL' AND m.vigente = 1
      LEFT JOIN contacto_social c 
        ON p.persona_id = c.persona_id 
        AND c.fecha_hora >= CAST(m.inicio_semana AS DATETIME2)
        AND c.fecha_hora <= DATEADD(second, -1, CAST(DATEADD(day, 7, m.inicio_semana) AS DATETIME2))
      WHERE p.activo = 1 AND p.codigo_interno <> 'P-000'
    `;

    if (inicioSemana) {
      req.input('inicio_semana', sql.Date, inicioSemana);
      query += ` AND m.inicio_semana = @inicio_semana`;
    }

    query += `
      GROUP BY p.persona_id, p.codigo_interno, p.fecha_nacimiento, u.distrito, m.inicio_semana, m.valor_meta
      ORDER BY p.codigo_interno ASC, m.inicio_semana DESC
    `;

    const res = await req.query(query);
    return res.recordset;
  }

  // Reporte Mensual Cardiometabólico
  async getReporteMensualCardiometabolico(mesPeriodo?: string): Promise<any[]> {
    const pool = await getPool();
    const req = pool.request();
    let query = `
      SELECT 
        p.codigo_interno,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad,
        u.distrito,
        CONVERT(VARCHAR(10), c.mes_periodo, 120) AS mes_periodo,
        COUNT(c.control_id) AS total_programados,
        COUNT(CASE WHEN r.dentro_de_meta = 1 THEN 1 END) AS controles_en_meta,
        COUNT(CASE WHEN r.resultado_id IS NOT NULL THEN 1 END) AS controles_realizados
      FROM persona p
      INNER JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
      INNER JOIN control_programado c ON p.persona_id = c.persona_id AND c.vigente = 1
      LEFT JOIN resultado_control r ON c.control_id = r.control_id AND r.es_referencia = 1
      WHERE p.activo = 1 AND p.codigo_interno <> 'P-000'
    `;

    if (mesPeriodo) {
      req.input('mes_periodo', sql.Date, mesPeriodo);
      query += ` AND c.mes_periodo = @mes_periodo`;
    }

    query += `
      GROUP BY p.persona_id, p.codigo_interno, p.fecha_nacimiento, u.distrito, c.mes_periodo
      ORDER BY p.codigo_interno ASC, c.mes_periodo DESC
    `;

    const res = await req.query(query);
    return res.recordset;
  }
}
