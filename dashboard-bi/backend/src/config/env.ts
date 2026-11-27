import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4001),
    TZ: z.string().default('America/Lima'),

    DATA_SOURCE: z.enum(['mock', 'sqlserver']).default('mock'),

    BI_DB_SERVER: z.string().optional(),
    BI_DB_PORT: z.coerce.number().int().positive().default(1433),
    BI_DB_DATABASE: z.string().default('prevencion_cognitiva_mart'),
    BI_DB_USER: z.string().optional(),
    BI_DB_PASSWORD: z.string().optional(),
    BI_DB_ENCRYPT: boolFromString.default(true),
    BI_DB_TRUST_SERVER_CERTIFICATE: boolFromString.default(false),

    ADMIN_USER: z.string().min(1, 'ADMIN_USER es obligatorio'),
    ADMIN_PASSWORD_HASH: z.string().min(1, 'ADMIN_PASSWORD_HASH es obligatorio'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),

    CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
    QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    FRONTEND_ORIGIN: z.string().default('http://localhost:5174')
  })
  .superRefine((value, ctx) => {
    if (!value.ADMIN_PASSWORD_HASH.startsWith('$2')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_PASSWORD_HASH'],
        message: 'ADMIN_PASSWORD_HASH debe ser un hash bcrypt (comienza con $2)'
      });
    }

    if (value.DATA_SOURCE === 'sqlserver') {
      const required: Array<keyof typeof value> = [
        'BI_DB_SERVER',
        'BI_DB_USER',
        'BI_DB_PASSWORD'
      ];
      for (const key of required) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${String(key)} es obligatorio cuando DATA_SOURCE=sqlserver`
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  // No se imprimen valores para no filtrar secretos en los logs.
  console.error(`[config] Variables de entorno inválidas:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
