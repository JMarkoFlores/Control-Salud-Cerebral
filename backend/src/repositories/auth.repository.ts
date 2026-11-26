import { getPool, sql } from '../config/database';

export interface UserAccountRecord {
  cuenta_id: number;
  persona_titular_id: number;
  correo_acceso: string;
  password_hash: string;
  rol: 'TITULAR' | 'ADMIN';
  autorizado: boolean;
  nombre_contacto?: string;
  parentesco?: string;
  persona_id: number;
  codigo_interno: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string;
  ubicacion_id: number;
  distrito?: string;
  activo: boolean;
}

export class AuthRepository {
  async findByEmail(email: string): Promise<UserAccountRecord | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('correo', sql.VarChar(120), email.trim().toLowerCase())
      .query(`
        SELECT 
          c.cuenta_id,
          c.persona_titular_id,
          c.correo_acceso,
          c.password_hash,
          c.rol,
          c.autorizado,
          c.nombre_contacto,
          c.parentesco,
          p.persona_id,
          p.codigo_interno,
          p.nombres,
          p.apellidos,
          CONVERT(VARCHAR(10), p.fecha_nacimiento, 120) AS fecha_nacimiento,
          p.sexo,
          p.ubicacion_id,
          p.activo,
          u.distrito
        FROM cuenta_rol c
        INNER JOIN persona p ON c.persona_titular_id = p.persona_id
        LEFT JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
        WHERE c.correo_acceso = @correo
      `);

    return result.recordset[0] || null;
  }

  async findById(cuentaId: number): Promise<UserAccountRecord | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('cuenta_id', sql.Int, cuentaId)
      .query(`
        SELECT 
          c.cuenta_id,
          c.persona_titular_id,
          c.correo_acceso,
          c.password_hash,
          c.rol,
          c.autorizado,
          c.nombre_contacto,
          c.parentesco,
          p.persona_id,
          p.codigo_interno,
          p.nombres,
          p.apellidos,
          CONVERT(VARCHAR(10), p.fecha_nacimiento, 120) AS fecha_nacimiento,
          p.sexo,
          p.ubicacion_id,
          p.activo,
          u.distrito
        FROM cuenta_rol c
        INNER JOIN persona p ON c.persona_titular_id = p.persona_id
        LEFT JOIN ubicacion u ON p.ubicacion_id = u.ubicacion_id
        WHERE c.cuenta_id = @cuenta_id
      `);

    return result.recordset[0] || null;
  }

  async createPersona(data: {
    nombres: string;
    apellidos: string;
    fecha_nacimiento: string;
    sexo: 'M' | 'F' | 'O';
    ubicacion_id: number;
  }): Promise<{ persona_id: number; codigo_interno: string }> {
    const pool = await getPool();

    // Generar siguiente código interno P-00X
    const countRes = await pool.request().query("SELECT COUNT(*) AS total FROM persona WHERE codigo_interno LIKE 'P-%'");
    const nextNum = (countRes.recordset[0]?.total || 0) + 1;
    const codigo_interno = `P-${String(nextNum).padStart(3, '0')}`;

    const insertRes = await pool.request()
      .input('codigo_interno', sql.VarChar(20), codigo_interno)
      .input('nombres', sql.VarChar(100), data.nombres)
      .input('apellidos', sql.VarChar(100), data.apellidos)
      .input('fecha_nacimiento', sql.Date, data.fecha_nacimiento)
      .input('sexo', sql.Char(1), data.sexo)
      .input('ubicacion_id', sql.Int, data.ubicacion_id)
      .query(`
        INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
        OUTPUT INSERTED.persona_id, INSERTED.codigo_interno
        VALUES (@codigo_interno, @nombres, @apellidos, @fecha_nacimiento, @sexo, @ubicacion_id, 1)
      `);

    return insertRes.recordset[0];
  }

  async createAccount(data: {
    persona_titular_id: number;
    correo_acceso: string;
    password_hash: string;
    rol: 'TITULAR' | 'ADMIN';
    nombre_contacto?: string;
    parentesco?: string;
  }): Promise<number> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_titular_id', sql.Int, data.persona_titular_id)
      .input('correo_acceso', sql.VarChar(120), data.correo_acceso.trim().toLowerCase())
      .input('password_hash', sql.VarChar(255), data.password_hash)
      .input('rol', sql.VarChar(20), data.rol)
      .input('nombre_contacto', sql.VarChar(100), data.nombre_contacto || null)
      .input('parentesco', sql.VarChar(50), data.parentesco || null)
      .query(`
        INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado, nombre_contacto, parentesco)
        OUTPUT INSERTED.cuenta_id
        VALUES (@persona_titular_id, @correo_acceso, @password_hash, @rol, 1, @nombre_contacto, @parentesco)
      `);

    return res.recordset[0].cuenta_id;
  }

  async getAcompanantesByTitular(personaId: number): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request()
      .input('persona_id', sql.Int, personaId)
      .query(`
        SELECT cuenta_id, correo_acceso, nombre_contacto, parentesco, autorizado, fecha_inicio
        FROM cuenta_rol
        WHERE persona_titular_id = @persona_id AND rol = 'ACOMPANANTE'
        ORDER BY cuenta_id DESC
      `);
    return res.recordset;
  }

  async setAcompananteAutorizado(cuentaId: number, titularPersonaId: number, autorizado: boolean): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('cuenta_id', sql.Int, cuentaId)
      .input('persona_id', sql.Int, titularPersonaId)
      .input('autorizado', sql.Bit, autorizado ? 1 : 0)
      .query(`
        UPDATE cuenta_rol
        SET autorizado = @autorizado
        WHERE cuenta_id = @cuenta_id AND persona_titular_id = @persona_id AND rol = 'ACOMPANANTE'
      `);
    return res.rowsAffected[0] > 0;
  }

  async updatePassword(cuentaId: number, passwordHash: string): Promise<boolean> {
    const pool = await getPool();
    const res = await pool.request()
      .input('cuenta_id', sql.Int, cuentaId)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .query(`
        UPDATE cuenta_rol
        SET password_hash = @password_hash
        WHERE cuenta_id = @cuenta_id
      `);
    return (res.rowsAffected[0] || 0) > 0;
  }
}
