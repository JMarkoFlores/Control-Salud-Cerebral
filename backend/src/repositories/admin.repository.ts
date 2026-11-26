import { getPool, sql } from '../config/database';
import bcrypt from 'bcryptjs';
import { getMondayOfCurrentWeek, getFirstDayOfMonth } from '../utils/dateUtils';

export class AdminRepository {
  async getGlobalStats(): Promise<any> {
    const pool = await getPool();

    // 1. Usuarios activos y métricas globales
    const usersRes = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM cuenta_rol) AS total_cuentas,
        (SELECT COUNT(*) FROM persona WHERE activo = 1 AND codigo_interno <> 'P-000') AS total_titulares,
        (SELECT COUNT(*) FROM persona WHERE codigo_interno <> 'P-000') AS total_participantes,
        (SELECT COUNT(*) FROM cuenta_rol WHERE rol = 'ADMIN') AS total_admins
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

  async getUsuarios(filtros?: { rol?: string; distrito?: string; activo?: boolean }): Promise<{ usuarios: any[]; resumen: any }> {
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
        p.ubicacion_id,
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

    // Métricas dinámicas calculadas siempre desde el estado real de la BD
    const statsRes = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM cuenta_rol) AS total_cuentas,
        (SELECT COUNT(*) FROM persona WHERE codigo_interno <> 'P-000') AS total_participantes,
        (SELECT COUNT(*) FROM cuenta_rol WHERE rol = 'TITULAR') AS total_titulares,
        (SELECT COUNT(*) FROM cuenta_rol WHERE rol = 'ADMIN') AS total_admins
    `);

    return {
      usuarios: res.recordset,
      resumen: statsRes.recordset[0] || {
        total_cuentas: 0,
        total_participantes: 0,
        total_titulares: 0,
        total_admins: 0,
      },
    };
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

  async getTitularesList(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT p.persona_id, p.codigo_interno, p.nombres, p.apellidos, u.distrito
      FROM persona p
      LEFT JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
      WHERE p.activo = 1 AND p.codigo_interno <> 'P-000'
      ORDER BY p.nombres ASC
    `);
    return res.recordset;
  }

  async crearUsuario(data: {
    nombres: string;
    apellidos: string;
    fecha_nacimiento: string;
    sexo: 'M' | 'F';
    ubicacion_id: number;
    correo_acceso?: string;
    password?: string;
    rol: 'TITULAR' | 'ADMIN';
    persona_titular_id?: number;
    nombre_contacto?: string;
    parentesco?: string;
    meta_actividad_minutos?: number;
    meta_social_dias?: number;
    meta_pa_sistolica?: number;
    meta_pa_diastolica?: number;
    meta_glucosa_min?: number;
    meta_glucosa_max?: number;
    meta_colesterol_max?: number;
    meta_imc_min?: number;
    meta_imc_max?: number;
  }): Promise<any> {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      let personaId: number;
      let codigoInterno: string;

      const codeRes = await transaction.request().query(`
        SELECT ISNULL(MAX(CAST(SUBSTRING(codigo_interno, 3, 10) AS INT)), 0) + 1 AS next_num
        FROM persona
        WHERE codigo_interno LIKE 'P-%'
      `);
      const nextNum = codeRes.recordset[0]?.next_num || 1;
      codigoInterno = `P-${String(nextNum).padStart(3, '0')}`;

      const pRes = await transaction.request()
        .input('codigo_interno', sql.VarChar(20), codigoInterno)
        .input('nombres', sql.VarChar(100), data.nombres)
        .input('apellidos', sql.VarChar(100), data.apellidos)
        .input('fecha_nacimiento', sql.Date, data.fecha_nacimiento)
        .input('sexo', sql.Char(1), data.sexo)
        .input('ubicacion_id', sql.Int, data.ubicacion_id)
        .query(`
          INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
          OUTPUT INSERTED.persona_id
          VALUES (@codigo_interno, @nombres, @apellidos, @fecha_nacimiento, @sexo, @ubicacion_id, 1)
        `);
      personaId = pRes.recordset[0].persona_id;

      if (data.rol === 'TITULAR') {
        const monday = getMondayOfCurrentWeek();
        const mes = getFirstDayOfMonth();

        const valorActividad = data.meta_actividad_minutos ? Number(data.meta_actividad_minutos) : 150;
        const valorSocial = data.meta_social_dias ? Number(data.meta_social_dias) : 3;
        const paSistolica = data.meta_pa_sistolica ? Number(data.meta_pa_sistolica) : 120;
        const paDiastolica = data.meta_pa_diastolica ? Number(data.meta_pa_diastolica) : 80;
        const glucosaMin = data.meta_glucosa_min ? Number(data.meta_glucosa_min) : 70;
        const glucosaMax = data.meta_glucosa_max ? Number(data.meta_glucosa_max) : 100;
        const colestMax = data.meta_colesterol_max ? Number(data.meta_colesterol_max) : 100;
        const imcMin = data.meta_imc_min ? Number(data.meta_imc_min) : 18.5;
        const imcMax = data.meta_imc_max ? Number(data.meta_imc_max) : 24.9;

        await transaction.request()
          .input('pid', sql.Int, personaId)
          .input('sem', sql.Date, monday)
          .input('act', sql.Int, valorActividad)
          .input('soc', sql.Int, valorSocial)
          .query(`
            INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
            VALUES (@pid, 'ACTIVIDAD_FISICA', @sem, @act, 'MINUTOS', 1, 'ACORDADA', 1);

            INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
            VALUES (@pid, 'CONTACTO_SOCIAL', @sem, @soc, 'DIAS', 1, 'ACORDADA', 1);
          `);

        await transaction.request()
          .input('pid', sql.Int, personaId)
          .input('mes', sql.Date, mes)
          .input('pa_sist', sql.Numeric(6, 2), paSistolica)
          .input('pa_diast', sql.Numeric(6, 2), paDiastolica)
          .input('pa_txt', sql.VarChar(80), `<= ${paSistolica}/${paDiastolica} mmHg`)
          .input('glu_min', sql.Numeric(6, 2), glucosaMin)
          .input('glu_max', sql.Numeric(6, 2), glucosaMax)
          .input('glu_txt', sql.VarChar(80), `${glucosaMin} - ${glucosaMax} mg/dL`)
          .input('col_max', sql.Numeric(6, 2), colestMax)
          .input('col_txt', sql.VarChar(80), `< ${colestMax} mg/dL`)
          .input('imc_min', sql.Numeric(6, 2), imcMin)
          .input('imc_max', sql.Numeric(6, 2), imcMax)
          .input('imc_txt', sql.VarChar(80), `${imcMin} - ${imcMax} kg/m²`)
          .query(`
            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, valor_meta_max_diast, unidad, vigente)
            VALUES (@pid, 'Presión arterial', @mes, @mes, @pa_txt, @pa_sist, @pa_diast, 'mmHg', 1);

            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'Glucosa', @mes, @mes, @glu_txt, @glu_min, @glu_max, 'mg/dL', 1);

            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'Colesterol LDL', @mes, @mes, @col_txt, @col_max, 'mg/dL', 1);

            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'IMC', @mes, @mes, @imc_txt, @imc_min, @imc_max, 'kg/m²', 1);
          `);
      }

      let cuentaId = null;
      if (data.correo_acceso && data.password) {
        const hash = await bcrypt.hash(data.password, 10);
        const cRes = await transaction.request()
          .input('persona_titular_id', sql.Int, personaId)
          .input('correo_acceso', sql.VarChar(120), data.correo_acceso.trim().toLowerCase())
          .input('password_hash', sql.VarChar(255), hash)
          .input('rol', sql.VarChar(20), data.rol)
          .input('nombre_contacto', sql.VarChar(100), data.nombre_contacto || `${data.nombres} ${data.apellidos}`.trim())
          .input('parentesco', sql.VarChar(50), data.parentesco || (data.rol === 'ADMIN' ? 'Administrador' : 'Titular'))
          .query(`
            INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado, nombre_contacto, parentesco)
            OUTPUT INSERTED.cuenta_id
            VALUES (@persona_titular_id, @correo_acceso, @password_hash, @rol, 1, @nombre_contacto, @parentesco)
          `);
        cuentaId = cRes.recordset[0].cuenta_id;
      }

      await transaction.commit();
      return { personaId, codigoInterno, cuentaId };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async actualizarUsuario(data: {
    persona_id: number;
    cuenta_id?: number | null;
    nombres: string;
    apellidos: string;
    fecha_nacimiento: string;
    sexo: 'M' | 'F';
    ubicacion_id: number;
    activo: boolean;
    correo_acceso?: string;
    password?: string;
    rol?: string;
    nombre_contacto?: string;
    parentesco?: string;
    meta_actividad_minutos?: number;
    meta_social_dias?: number;
    meta_pa_sistolica?: number;
    meta_pa_diastolica?: number;
    meta_glucosa_min?: number;
    meta_glucosa_max?: number;
    meta_colesterol_max?: number;
    meta_imc_min?: number;
    meta_imc_max?: number;
  }): Promise<void> {
    const pool = await getPool();

    // Actualización de persona participante / admin
    await pool.request()
      .input('pid', sql.Int, data.persona_id)
      .input('nombres', sql.VarChar(100), data.nombres)
      .input('apellidos', sql.VarChar(100), data.apellidos)
      .input('fecha_nacimiento', sql.Date, data.fecha_nacimiento)
      .input('sexo', sql.Char(1), data.sexo)
      .input('ubicacion_id', sql.Int, data.ubicacion_id)
      .input('activo', sql.Bit, data.activo ? 1 : 0)
      .query(`
        UPDATE persona
        SET nombres = @nombres,
            apellidos = @apellidos,
            fecha_nacimiento = @fecha_nacimiento,
            sexo = @sexo,
            ubicacion_id = @ubicacion_id,
            activo = @activo
        WHERE persona_id = @pid
      `);

    if (data.cuenta_id) {
      const req = pool.request()
        .input('cid', sql.Int, data.cuenta_id)
        .input('correo', sql.VarChar(120), data.correo_acceso?.trim().toLowerCase())
        .input('rol', sql.VarChar(20), data.rol)
        .input('nombre_contacto', sql.VarChar(100), data.nombre_contacto || null)
        .input('parentesco', sql.VarChar(50), data.parentesco || null);

      let updateQuery = `
        UPDATE cuenta_rol
        SET correo_acceso = @correo,
            rol = @rol,
            nombre_contacto = @nombre_contacto,
            parentesco = @parentesco
      `;

      if (data.password && data.password.trim().length > 0) {
        const hash = await bcrypt.hash(data.password, 10);
        req.input('hash', sql.VarChar(255), hash);
        updateQuery += `, password_hash = @hash`;
      }

      updateQuery += ` WHERE cuenta_id = @cid`;
      await req.query(updateQuery);
    } else if (data.correo_acceso && data.password && data.rol) {
      const hash = await bcrypt.hash(data.password, 10);
      await pool.request()
        .input('pid', sql.Int, data.persona_id)
        .input('correo', sql.VarChar(120), data.correo_acceso.trim().toLowerCase())
        .input('hash', sql.VarChar(255), hash)
        .input('rol', sql.VarChar(20), data.rol)
        .query(`
          INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado)
          VALUES (@pid, @correo, @hash, @rol, 1)
        `);
    }

    if (data.meta_actividad_minutos !== undefined ||
        data.meta_social_dias !== undefined ||
        data.meta_pa_sistolica !== undefined ||
        data.meta_glucosa_min !== undefined ||
        data.meta_colesterol_max !== undefined ||
        data.meta_imc_min !== undefined) {
      await this.actualizarMetasTitular(data.persona_id, data);
    }
  }

  async getMetasTitular(personaId: number): Promise<any> {
    const pool = await getPool();
    const monday = getMondayOfCurrentWeek();
    const mes = getFirstDayOfMonth();

    // Metas semanales
    const metasRes = await pool.request()
      .input('pid', sql.Int, personaId)
      .query(`
        SELECT habito, valor_meta, unidad
        FROM meta_semanal
        WHERE persona_id = @pid AND vigente = 1
      `);

    // Controles programados
    const controlesRes = await pool.request()
      .input('pid', sql.Int, personaId)
      .input('mes', sql.Date, mes)
      .query(`
        SELECT tipo_control, valor_meta_min, valor_meta_max, valor_meta_max_diast, unidad
        FROM control_programado
        WHERE persona_id = @pid AND mes_periodo = @mes AND vigente = 1
      `);

    let meta_actividad_minutos = 150;
    let meta_social_dias = 3;
    for (const m of metasRes.recordset) {
      if (m.habito === 'ACTIVIDAD_FISICA') meta_actividad_minutos = m.valor_meta;
      if (m.habito === 'CONTACTO_SOCIAL') meta_social_dias = m.valor_meta;
    }

    let meta_pa_sistolica = 120;
    let meta_pa_diastolica = 80;
    let meta_glucosa_min = 70;
    let meta_glucosa_max = 100;
    let meta_colesterol_max = 100;
    let meta_imc_min = 18.5;
    let meta_imc_max = 24.9;

    for (const c of controlesRes.recordset) {
      if (c.tipo_control === 'Presión arterial') {
        if (c.valor_meta_max) meta_pa_sistolica = Number(c.valor_meta_max);
        if (c.valor_meta_max_diast) meta_pa_diastolica = Number(c.valor_meta_max_diast);
      } else if (c.tipo_control === 'Glucosa') {
        if (c.valor_meta_min) meta_glucosa_min = Number(c.valor_meta_min);
        if (c.valor_meta_max) meta_glucosa_max = Number(c.valor_meta_max);
      } else if (c.tipo_control === 'Colesterol LDL') {
        if (c.valor_meta_max) meta_colesterol_max = Number(c.valor_meta_max);
      } else if (c.tipo_control === 'IMC') {
        if (c.valor_meta_min) meta_imc_min = Number(c.valor_meta_min);
        if (c.valor_meta_max) meta_imc_max = Number(c.valor_meta_max);
      }
    }

    return {
      meta_actividad_minutos,
      meta_social_dias,
      meta_pa_sistolica,
      meta_pa_diastolica,
      meta_glucosa_min,
      meta_glucosa_max,
      meta_colesterol_max,
      meta_imc_min,
      meta_imc_max,
    };
  }

  async actualizarMetasTitular(personaId: number, metas: {
    meta_actividad_minutos?: number;
    meta_social_dias?: number;
    meta_pa_sistolica?: number;
    meta_pa_diastolica?: number;
    meta_glucosa_min?: number;
    meta_glucosa_max?: number;
    meta_colesterol_max?: number;
    meta_imc_min?: number;
    meta_imc_max?: number;
  }): Promise<void> {
    const pool = await getPool();
    const monday = getMondayOfCurrentWeek();
    const mes = getFirstDayOfMonth();

    // 1. Meta actividad física
    if (metas.meta_actividad_minutos !== undefined && metas.meta_actividad_minutos !== null) {
      const verRes = await pool.request()
        .input('pid', sql.Int, personaId)
        .query(`SELECT ISNULL(MAX(version_meta), 0) AS max_v FROM meta_semanal WHERE persona_id = @pid AND habito = 'ACTIVIDAD_FISICA'`);
      const nextV = (verRes.recordset[0]?.max_v || 0) + 1;

      await pool.request()
        .input('pid', sql.Int, personaId)
        .query(`UPDATE meta_semanal SET vigente = 0 WHERE persona_id = @pid AND habito = 'ACTIVIDAD_FISICA' AND vigente = 1`);

      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('sem', sql.Date, monday)
        .input('val', sql.Int, Number(metas.meta_actividad_minutos))
        .input('v', sql.Int, nextV)
        .query(`
          INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
          VALUES (@pid, 'ACTIVIDAD_FISICA', @sem, @val, 'MINUTOS', @v, 'PROFESIONAL_SALUD', 1)
        `);
    }

    // 2. Meta contacto social
    if (metas.meta_social_dias !== undefined && metas.meta_social_dias !== null) {
      const verRes = await pool.request()
        .input('pid', sql.Int, personaId)
        .query(`SELECT ISNULL(MAX(version_meta), 0) AS max_v FROM meta_semanal WHERE persona_id = @pid AND habito = 'CONTACTO_SOCIAL'`);
      const nextV = (verRes.recordset[0]?.max_v || 0) + 1;

      await pool.request()
        .input('pid', sql.Int, personaId)
        .query(`UPDATE meta_semanal SET vigente = 0 WHERE persona_id = @pid AND habito = 'CONTACTO_SOCIAL' AND vigente = 1`);

      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('sem', sql.Date, monday)
        .input('val', sql.Int, Number(metas.meta_social_dias))
        .input('v', sql.Int, nextV)
        .query(`
          INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
          VALUES (@pid, 'CONTACTO_SOCIAL', @sem, @val, 'DIAS', @v, 'PROFESIONAL_SALUD', 1)
        `);
    }

    // 3. Controles cardiometabólicos
    if (metas.meta_pa_sistolica !== undefined || metas.meta_pa_diastolica !== undefined) {
      const paSist = Number(metas.meta_pa_sistolica || 120);
      const paDiast = Number(metas.meta_pa_diastolica || 80);
      const paTxt = `<= ${paSist}/${paDiast} mmHg`;
      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('mes', sql.Date, mes)
        .input('sist', sql.Numeric(6, 2), paSist)
        .input('diast', sql.Numeric(6, 2), paDiast)
        .input('txt', sql.VarChar(80), paTxt)
        .query(`
          IF EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @pid AND tipo_control = 'Presión arterial' AND mes_periodo = @mes)
            UPDATE control_programado
            SET valor_meta_max = @sist, valor_meta_max_diast = @diast, criterio_meta_texto = @txt, vigente = 1
            WHERE persona_id = @pid AND tipo_control = 'Presión arterial' AND mes_periodo = @mes
          ELSE
            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, valor_meta_max_diast, unidad, vigente)
            VALUES (@pid, 'Presión arterial', @mes, @mes, @txt, @sist, @diast, 'mmHg', 1)
        `);
    }

    if (metas.meta_glucosa_min !== undefined || metas.meta_glucosa_max !== undefined) {
      const gMin = Number(metas.meta_glucosa_min || 70);
      const gMax = Number(metas.meta_glucosa_max || 100);
      const gTxt = `${gMin} - ${gMax} mg/dL`;
      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('mes', sql.Date, mes)
        .input('gmin', sql.Numeric(6, 2), gMin)
        .input('gmax', sql.Numeric(6, 2), gMax)
        .input('txt', sql.VarChar(80), gTxt)
        .query(`
          IF EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @pid AND tipo_control = 'Glucosa' AND mes_periodo = @mes)
            UPDATE control_programado
            SET valor_meta_min = @gmin, valor_meta_max = @gmax, criterio_meta_texto = @txt, vigente = 1
            WHERE persona_id = @pid AND tipo_control = 'Glucosa' AND mes_periodo = @mes
          ELSE
            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'Glucosa', @mes, @mes, @txt, @gmin, @gmax, 'mg/dL', 1)
        `);
    }

    if (metas.meta_colesterol_max !== undefined) {
      const cMax = Number(metas.meta_colesterol_max || 100);
      const cTxt = `< ${cMax} mg/dL`;
      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('mes', sql.Date, mes)
        .input('cmax', sql.Numeric(6, 2), cMax)
        .input('txt', sql.VarChar(80), cTxt)
        .query(`
          IF EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @pid AND tipo_control = 'Colesterol LDL' AND mes_periodo = @mes)
            UPDATE control_programado
            SET valor_meta_max = @cmax, criterio_meta_texto = @txt, vigente = 1
            WHERE persona_id = @pid AND tipo_control = 'Colesterol LDL' AND mes_periodo = @mes
          ELSE
            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'Colesterol LDL', @mes, @mes, @txt, @cmax, 'mg/dL', 1)
        `);
    }

    if (metas.meta_imc_min !== undefined || metas.meta_imc_max !== undefined) {
      const iMin = Number(metas.meta_imc_min || 18.5);
      const iMax = Number(metas.meta_imc_max || 24.9);
      const iTxt = `${iMin} - ${iMax} kg/m²`;
      await pool.request()
        .input('pid', sql.Int, personaId)
        .input('mes', sql.Date, mes)
        .input('imin', sql.Numeric(6, 2), iMin)
        .input('imax', sql.Numeric(6, 2), iMax)
        .input('txt', sql.VarChar(80), iTxt)
        .query(`
          IF EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @pid AND tipo_control = 'IMC' AND mes_periodo = @mes)
            UPDATE control_programado
            SET valor_meta_min = @imin, valor_meta_max = @imax, criterio_meta_texto = @txt, vigente = 1
            WHERE persona_id = @pid AND tipo_control = 'IMC' AND mes_periodo = @mes
          ELSE
            INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
            VALUES (@pid, 'IMC', @mes, @mes, @txt, @imin, @imax, 'kg/m²', 1)
        `);
    }
  }

  async toggleActivoUsuario(personaId: number, cuentaId?: number): Promise<boolean> {
    const pool = await getPool();

    if (cuentaId) {
      const cRes = await pool.request()
        .input('cid', sql.Int, cuentaId)
        .query(`
          UPDATE cuenta_rol SET autorizado = CASE WHEN autorizado = 1 THEN 0 ELSE 1 END WHERE cuenta_id = @cid;
          SELECT autorizado FROM cuenta_rol WHERE cuenta_id = @cid;
        `);
      if (cRes.recordset.length > 0) {
        return cRes.recordset[0].autorizado === 1;
      }
    }

    const res = await pool.request()
      .input('pid', sql.Int, personaId)
      .query(`
        UPDATE persona SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
        WHERE persona_id = @pid;
        SELECT activo FROM persona WHERE persona_id = @pid;
      `);
    return res.recordset[0]?.activo === 1;
  }

  async eliminarUsuario(personaId: number, cuentaId?: number): Promise<{ eliminadoFisico: boolean; mensaje: string }> {
    const pool = await getPool();

    const movRes = await pool.request()
      .input('pid', sql.Int, personaId)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM sesion_fisica WHERE persona_id = @pid) +
          (SELECT COUNT(*) FROM contacto_social WHERE persona_id = @pid) +
          (SELECT COUNT(*) FROM resultado_control WHERE persona_id = @pid) +
          (SELECT COUNT(*) FROM alerta WHERE persona_id = @pid) AS total_movimientos
      `);

    const total = movRes.recordset[0]?.total_movimientos || 0;

    if (total > 0) {
      await pool.request()
        .input('pid', sql.Int, personaId)
        .query(`
          UPDATE persona SET activo = 0 WHERE persona_id = @pid;
          UPDATE cuenta_rol SET autorizado = 0 WHERE persona_titular_id = @pid;
        `);
      return { eliminadoFisico: false, mensaje: 'Usuario inactivado correctamente. Se conserva su historial clínico para auditoría médica.' };
    } else {
      if (cuentaId) {
        await pool.request().input('cid', sql.Int, cuentaId).query(`DELETE FROM cuenta_rol WHERE cuenta_id = @cid`);
      }
      await pool.request().input('pid', sql.Int, personaId).query(`
        DELETE FROM recordatorio WHERE persona_id = @pid;
        DELETE FROM control_programado WHERE persona_id = @pid;
        DELETE FROM meta_semanal WHERE persona_id = @pid;
        DELETE FROM cuenta_rol WHERE persona_titular_id = @pid;
        DELETE FROM persona WHERE persona_id = @pid;
      `);
      return { eliminadoFisico: true, mensaje: 'Usuario y participante eliminados completamente del sistema.' };
    }
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
