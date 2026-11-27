# Dashboard BI · Salud Cerebral

Tablero de solo lectura sobre el Data Mart dimensional
`prevencion_cognitiva_mart`. Es una segunda aplicación del monorepo: no agrega
páginas a la app transaccional y se publica en un subdominio propio. En Compose
usa `DATA_SOURCE=sqlserver` y los datos reales que produce el ETL desde el OLTP.

## Estado de las fases

- **Fases 1–4 completadas:** acceso, filtros, seis páginas, visuales, repositorio
  `sqlserver`, Docker, login SQL de solo lectura, configuración Dokploy,
  selección cruzada y exportación CSV.
- **Pendiente:** mapa real con geocodificación/coordenadas y atajos de teclado.

El backend usa `DATA_SOURCE=sqlserver` en Compose. Si SQL Server falla, la API
devuelve un error y la interfaz lo muestra; nunca cambia a mock. El mock solo se
usa de forma explícita para demos locales sin base de datos.

## Estructura

```
dashboard-bi/
  backend/    Express + TypeScript + Zod + JWT + mssql
  frontend/   React 18 + Vite + TypeScript + Tailwind + Google Charts
```

Cada carpeta instala y compila de manera independiente con Node.js 24 y pnpm.

## Desarrollo local

Backend (puerto 4001), con `dashboard-bi/backend/.env`:

```bash
cd dashboard-bi/backend
pnpm install --frozen-lockfile
pnpm hash -- "UnaContraseñaSegura"   # copiar el hash a ADMIN_PASSWORD_HASH
pnpm verify:sql                      # comprobar vistas, totales y permisos
pnpm dev
```

El `.env.example` ya apunta a `DATA_SOURCE=sqlserver`. Completa
`BI_DB_SERVER`, `BI_DB_DATABASE`, `BI_DB_USER`, `BI_DB_PASSWORD` y los parámetros
TLS. Para una demo sin base de datos puedes cambiar explícitamente a
`DATA_SOURCE=mock`; la interfaz mostrará el badge “Datos de prueba”.

Frontend (puerto 5174, proxy local `/api` a 4001):

```bash
cd dashboard-bi/frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:5174`. Las credenciales se definen en el backend con
`ADMIN_USER` y `ADMIN_PASSWORD_HASH`; no existe registro ni cuenta demo.

## Variables

`backend/.env.example` documenta la configuración local del servicio API;
`frontend/.env.example` documenta la clave opcional de Maps. Para Compose/Dokploy,
usa la lista de `.env.example` en la raíz del repositorio o
`dashboard-bi/.env.example`:

| Variable | Uso |
| --- | --- |
| `MSSQL_SA_PASSWORD` | Contraseña de la instancia SQL Server. |
| `MSSQL_PID` | `Developer` o la edición disponible. |
| `MSSQL_MEMORY_LIMIT_MB` | Memoria reservada para SQL Server. |
| `TZ` | `America/Lima`. |
| `JWT_SECRET` | Secreto JWT de la app transaccional. |
| `DEMO_LOGIN_ENABLED` | `true` solo para demo; `false` en producción real. |
| `DB_DATABASE` | `prevencion_cognitiva_oltp`. |
| `SEED_DATA` | `false` en operación real. |
| `RESET_DB` / `RESET_MART` | `false`; con `true` borran datos. |
| `BI_DB_USER` | Login SQL de lectura, por defecto `bi_lector`. |
| `BI_DB_PASSWORD` | Contraseña de ese login; obligatoria. |
| `BI_ADMIN_USER` | Administrador único del dashboard. |
| `BI_ADMIN_PASSWORD_HASH` | Hash bcrypt del administrador, no la contraseña. |
| `BI_JWT_SECRET` | Secreto JWT propio del dashboard, 32+ caracteres. |
| `BI_JWT_EXPIRES_IN` | `8h`. |
| `VITE_GOOGLE_MAPS_API_KEY` | Opcional; argumento público de compilación para Maps. |

El hash bcrypt contiene `$`. En Dokploy guárdalo entre comillas simples (por
ejemplo, `'$2b$...'`) para que llegue íntegro. No incluyas secretos en imágenes,
archivos versionados ni en capturas de configuración.

`BI_DB_PASSWORD` debe cumplir la política de SQL Server (`CHECK_POLICY=ON`),
porque `deploy/bi-login.sql` crea/actualiza el login con esa política.

## Docker y Dokploy

Compose levanta **dos aplicaciones y dos bases** sobre una sola instancia SQL
Server:

- `sqlserver`: `prevencion_cognitiva_oltp` + `prevencion_cognitiva_mart`.
- `db-init` (`INIT_MODE=oltp`): crea el OLTP solo si no existe y carga el seed
  si `SEED_DATA=true`. Es rápido y la app transaccional espera solo a este job.
- `backend` / `frontend`: aplicación transaccional, sin cambios de contrato.
- `db-mart-init` (`INIT_MODE=mart`): ejecuta `01`–`05` de `bd-dim-sql/`, carga
  dimensiones y hechos, valida y crea/actualiza el login `BI_DB_USER`. Es
  automático en cada despliegue.
- `bi-backend`: Node 24, usuario `node`, puerto interno 4001 y healthcheck en
  `/api/health`. Espera a que `db-mart-init` termine correctamente.
- `bi-frontend`: nginx en puerto 80, SPA y proxy `/api/` hacia
  `bi-backend:4001`.
- `cloudbeaver`: panel de administración de las dos bases; debe protegerse con
  una segunda capa.

Los jobs de inicialización usan una imagen propia construida con
`deploy/Dockerfile`; los scripts viajan dentro de la imagen. Así Dokploy no
depende de bind mounts relativos al repositorio, que pueden quedar vacíos al
volver a clonar en cada despliegue.

En **Domains**, configura un subdominio propio, por ejemplo
`bi-saludcerebral.giansmd.dev`, hacia `bi-frontend`, puerto 80. Conserva el
dominio y el enrutamiento actuales para la aplicación transaccional. No
compartas el mismo dominio: ambas apps usan `/api` para servicios distintos.

En cada despliegue `db-mart-init` ejecuta `01`–`05` de `bd-dim-sql/` y recarga
los hechos desde el OLTP. El OLTP existente se conserva. El login BI solo recibe
`GRANT SELECT ON SCHEMA::bi` en `prevencion_cognitiva_mart`. La app consulta las
vistas `bi.v_IndicadoresSemanales`, `bi.v_IndicadorFCM` y
`bi.v_ControlesDetalle`, nunca consulta `DIM_PERSONA` directamente. Cada consulta
usa filtros parametrizados, pool, timeout y caché de cinco minutos.

Deja `RESET_DB=false` y `RESET_MART=false`: con `true`, el siguiente despliegue
borrará datos de las bases indicadas. Define `SEED_DATA=true` antes del primer
despliegue solo si necesitas datos demo; el seed solo se inserta al crear OLTP.
Si `db-init` o `db-mart-init` fallan, revisa los logs y repara o restaura la
base; no se borran datos automáticamente para recuperarse de un fallo parcial.

Comandos locales:

```bash
# Ambas apps + ambas bases: 8080 (transaccional) y 8081 (BI)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d --build

# Producción / Dokploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Haz copias SQL de las dos bases y guárdalas fuera del VPS. Por ejemplo:

```sql
BACKUP DATABASE [prevencion_cognitiva_oltp]
  TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_oltp.bak' WITH INIT, COMPRESSION;
BACKUP DATABASE [prevencion_cognitiva_mart]
  TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_mart.bak' WITH INIT, COMPRESSION;
```

Descarga/copia los `.bak` fuera del volumen y rota versiones; comprueba que se
puedan restaurar. El VPS de producción debe ser Linux x86-64 con al menos 4 GB
de RAM (8 GB recomendable para datos reales).

## Datos reales

1. La fuente es el OLTP (`prevencion_cognitiva_oltp`). El ETL crea/actualiza el
   Data Mart (`prevencion_cognitiva_mart`) con los scripts `01`–`05`.
2. `db-mart-init` corre automáticamente en cada despliegue. Si el OLTP ya tiene
   tus participantes, el dashboard mostrará exactamente esos participantes; no
   se inventan ni se cargan datos demo con `SEED_DATA=false`.
3. Para refrescar sin redesplegar usa **Reportes Analíticos → Actualizar Data
   Mart** en la app transaccional (`POST /api/v1/admin/datamart/refresh`) o:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env run --rm db-mart-init
   ```
4. El dashboard refleja el refresco al vencer su caché de cinco minutos o al
   reiniciar `bi-backend`.
5. Si el mart es de una versión anterior, `RESET_MART=true` lo elimina y
   reconstruye; úsalo solo si realmente quieres descartar el mart actual.

## Reglas de cálculo y privacidad

- Porcentaje agregado: `100 × SUM(numerador) / SUM(denominador)` con filas
  evaluables; no promedia porcentajes.
- Sin denominador o sin filas evaluables, devuelve `null` y la interfaz indica
  “Sin datos”.
- CAF: Óptimo ≥ 100 %, Bueno ≥ 70 %, Regular ≥ 50 %, Malo < 50 %.
- CCS y FCM: Bueno = 100 %, Regular > 0 %, Malo = 0 %.
- Los pendientes de FCM no entran en el porcentaje agregado.
- Las semanas se asignan al año y mes de su lunes. Los hechos semanales y
  mensuales se consultan por separado.
- Filtros fijos: país Perú y edad 30–65.
- Solo se expone `key_persona`, mostrado como “Participante #N”; no se consultan
  nombres ni apellidos.

## Validación local

```bash
cd dashboard-bi/backend
pnpm test
pnpm build
```

```bash
cd dashboard-bi/frontend
pnpm build
```

Con una base real:

```bash
cd dashboard-bi/backend
DATA_SOURCE=sqlserver pnpm verify:sql
```

La configuración Compose se valida desde la raíz con
`docker compose -f docker-compose.prod.yml config`. El despliegue con volúmenes
nuevos requiere que Docker esté disponible en el entorno.
