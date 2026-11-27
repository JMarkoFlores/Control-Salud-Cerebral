# Dashboard BI · Salud Cerebral

Tablero de solo lectura sobre el Data Mart dimensional
`prevencion_cognitiva_mart`. Se integra al único proyecto Compose del
repositorio y se publica en un subdominio propio. No comparte el prefijo `/api`
del frontend transaccional.

## Estado de las fases

- **Fases 1 y 2 completadas:** acceso, filtros, seis páginas, visuales y mock.
- **Fase 3 completada en código:** repositorio `sqlserver`, imágenes Docker,
  inicialización y login SQL de solo lectura, y configuración Dokploy.
- **Fases 4 y 5 pendientes:** selección cruzada/exportación CSV, mapa real y
  atajos de teclado.

El backend usa `DATA_SOURCE=sqlserver` en Compose. Si SQL Server falla, la API
devuelve un error y la interfaz lo muestra; nunca cambia a mock. El mock solo
se usa de forma explícita en desarrollo local.

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
pnpm hash -- "UnaContraseñaSegura"
pnpm dev
```

Para trabajar con el mock, deja `DATA_SOURCE=mock`. Para conectar a SQL Server,
usa `DATA_SOURCE=sqlserver` y completa `BI_DB_SERVER`, `BI_DB_DATABASE`,
`BI_DB_USER`, `BI_DB_PASSWORD` y los parámetros TLS. No se imprime el secreto JWT
ni las credenciales de SQL en los logs.

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
usa la lista de `dashboard-bi/.env.example` y define sus valores en **Environment**
antes de desplegar:

| Variable | Uso |
| --- | --- |
| `BI_DB_USER` | Login SQL de lectura, por defecto `bi_lector`. |
| `BI_DB_PASSWORD` | Contraseña de ese login; obligatoria. |
| `BI_ADMIN_USER` | Administrador único del dashboard. |
| `BI_ADMIN_PASSWORD_HASH` | Hash bcrypt del administrador, no la contraseña. |
| `BI_JWT_SECRET` | Secreto JWT propio del dashboard, mínimo 16 caracteres. |
| `VITE_GOOGLE_MAPS_API_KEY` | Opcional; argumento público de compilación para Maps. |

El hash bcrypt contiene `$`. En Dokploy guárdalo entre comillas simples (por
ejemplo, `'$2b$...'`) para que llegue íntegro. No incluyas secretos en imágenes,
archivos versionados ni en capturas de configuración.

## Docker y Dokploy

El único Compose es `docker-compose.prod.yml`; reutiliza el servicio `sqlserver`
y su volumen. Los servicios nuevos son:

- `bi-backend`: Node 24, usuario `node`, puerto interno 4001 y healthcheck en
  `/api/health`.
- `bi-frontend`: nginx en puerto 80, SPA y proxy `/api/` hacia
  `bi-backend:4001`.
- `db-init`: se ejecuta al desplegar, sin perfil ni política de reinicio. El
  backend BI espera que termine correctamente. La app transaccional no depende
  del dashboard.

En **Domains**, configura un subdominio propio, por ejemplo
`bi-saludcerebral.giansmd.dev`, hacia `bi-frontend`, puerto 80. Conserva el
dominio y el enrutamiento actuales para la aplicación transaccional.

En cada despliegue `db-init` crea OLTP solo si no existe, ejecuta los scripts
`01`–`07` de `bd-dim-sql/` y crea/actualiza el login SQL. Los pasos 03 y 04
actualizan dimensiones y recargan los hechos; el OLTP existente se conserva. El
login solo recibe `GRANT SELECT ON SCHEMA::bi` en `prevencion_cognitiva_mart`.
La app consulta las vistas `bi.v_IndicadoresSemanales`, `bi.v_IndicadorFCM` y
`bi.v_ControlesDetalle`, nunca consulta `DIM_PERSONA` directamente. Cada consulta
usa filtros parametrizados, pool, timeout y caché de cinco minutos.

Deja `RESET_DB=false` y `RESET_MART=false`: con `true`, el siguiente despliegue
borrará datos de las bases indicadas. Define `SEED_DATA=true` antes del primer
despliegue si necesitas datos demo; el seed solo se inserta al crear OLTP.
Si `db-init` falla, revisa los logs y repara o restaura la base; no se borran
datos automáticamente para recuperarse de un fallo parcial.

Haz copias SQL de las dos bases y guárdalas fuera del VPS. Por ejemplo:

```sql
BACKUP DATABASE [prevencion_cognitiva_oltp]
  TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_oltp.bak' WITH INIT, COMPRESSION;
BACKUP DATABASE [prevencion_cognitiva_mart]
  TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_mart.bak' WITH INIT, COMPRESSION;
```

Descarga/copia los `.bak` fuera del volumen y rota versiones; comprueba que se
puedan restaurar. El VPS de producción debe ser Linux x86-64 con al menos 4 GB
de RAM.

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

La configuración Compose se valida desde la raíz con
`docker compose -f docker-compose.prod.yml config`. El despliegue con volúmenes
nuevos requiere que Docker esté disponible en el entorno.
