import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, minLength: number): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[config] Falta la variable de entorno ${name}. Definela en .env o en Dokploy.`);
  }
  if (value.length < minLength) {
    throw new Error(`[config] ${name} debe tener al menos ${minLength} caracteres.`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    server: process.env.DB_SERVER || '.',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_DATABASE || 'prevencion_cognitiva_oltp',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    authType: process.env.DB_AUTH_TYPE || 'windows', // 'windows' | 'sql'
    driver: process.env.DB_ODBC_DRIVER || '{ODBC Driver 18 for SQL Server}',
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000', 10),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '15000', 10),
  },
  JWT: {
    // Sin valor por defecto: el repo es público y un secreto conocido permite forjar tokens.
    secret: required('JWT_SECRET', 32),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // Orígenes permitidos para CORS, separados por coma. Vacío = solo mismo origen.
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  TZ: process.env.TZ || 'America/Lima',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};
