import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_prevencion_cognitiva_g1_trujillo_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  TZ: process.env.TZ || 'America/Lima',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};
