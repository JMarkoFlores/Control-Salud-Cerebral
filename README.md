# Control de Salud Cerebral — Prevención del Deterioro Cognitivo (G1)
> **Plataforma Web de Salud Digital, Analítica Preventiva y Gestión de Hábitos • Piloto Trujillo (Perú) para Adultos de 30 a 65 años**

Sistema integral de salud digital diseñado bajo principios de Arquitectura Limpia en Capas (**Node.js / Express + TypeScript**) y una interfaz de usuario moderna, reactiva y accesible (**React 18 + Vite + Tailwind CSS + Recharts + Lucide**), conectado a una base de datos relacional robusta en **Microsoft SQL Server**.

---

## 📌 Tabla de Contenidos
1. [Descripción General](#1-descripción-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Roles del Sistema y Gestión Clínica](#3-roles-del-sistema-y-gestión-clínica)
4. [Credenciales de Prueba (Demo)](#4-credenciales-de-prueba-demo)
5. [Instalación y Despliegue Local](#5-instalación-y-despliegue-local)
6. [Quickstart de Despliegue en VPS (Dokploy)](#6-quickstart-de-despliegue-en-vps-dokploy)
7. [Reglas de Negocio y Algoritmos Clínicos](#7-reglas-de-negocio-y-algoritmos-clínicos)
8. [Estructura del Proyecto](#8-estructura-del-proyecto)

---

## 1. Descripción General

El proyecto **Control de Salud Cerebral** tiene como objetivo prevenir y mitigar el riesgo de deterioro cognitivo y demencias en adultos de 30 a 65 años mediante el fortalecimiento de tres pilares fundamentales de la reserva neurocognitiva:

1. **Actividad Física Regular:** Registro y control de minutos semanales de ejercicio (caminata, deportes, entrenamientos).
2. **Contacto Social Significativo:** Seguimiento de interacciones cara a cara, familiares y comunitarias para estimulación afectiva y cognitiva.
3. **Control Cardiometabólico:** Vigilancia periódica de factores de riesgo vascular (presión arterial sistólica/diastólica, glucosa en ayunas, colesterol LDL e IMC).

---

## 2. Stack Tecnológico

### Backend (`/backend`)
- **Runtime:** Node.js (v24) con TypeScript en modo estricto.
- **Framework:** Express con arquitectura modular basada en Capas (Rutas $\rightarrow$ Controladores $\rightarrow$ Servicios $\rightarrow$ Repositorios).
- **Base de Datos:** Microsoft SQL Server (`mssql`), Connection Pooling y consultas 100% parametrizadas (protección contra SQL Injection).
- **Seguridad:** Autenticación JWT (`jsonwebtoken`), hash de contraseñas con salting (`bcryptjs`) y control de acceso basado en roles (RBAC).
- **Automatización de Tareas:** `node-cron` para evaluación de alertas matutinas, nocturnas y cierres semanales.
- **Zona Horaria y Región:** `America/Lima` (Perú) / Formato de semana de Lunes a Domingo.

### Frontend (`/frontend`)
- **Librería UI:** React 18 + Vite + TypeScript.
- **Estilos:** Tailwind CSS con paleta temática *Health-Tech* (Azul Petróleo `#0F4C5C`, Verde Esmeralda `#10B981`, Ámbar `#F59E0B`, Coral `#EF4444`).
- **Visualización de Datos:** Recharts (tendencias, gráficos de barras y comparativas) + Anillo SVG Gauge de Salud Cerebral.
- **Iconografía:** Lucide React.
- **Asistente:** Widget interactivo de asistencia en tiempo real.

### Base de Datos (`/bd-sql`)
- **Motor:** Microsoft SQL Server (Transact-SQL).
- **Base de Datos:** `prevencion_cognitiva_oltp`.
- **17 Tablas Normalizadas (3FN):**
  `ubicacion`, `persona`, `cuenta_rol`, `meta_semanal`, `sesion_fisica`, `contacto_social`, `confirmacion_diaria`, `control_programado`, `resultado_control`, `regla_alerta`, `ejecucion_regla`, `alerta`, `evaluacion_salud_cerebral`, `simulacion_riesgo`, `recordatorio`, `catalogo_logro`, `logro_obtenido`.

---

## 3. Roles del Sistema y Gestión Clínica

El sistema cuenta con un modelo estricto de dos roles autorizados:

### 👤 Titular del Programa (Paciente / Participante)
- **Mi Dashboard:** Puntaje global de salud cerebral (0–100 pts), desglose por pilares y estado de la semana activa.
- **Hábitos y Metas:** Registro de sesiones de actividad física, contactos sociales y panel de confirmación diaria.
  - **Supervisión Protegida:** Las metas semanales son **solo lectura** para el titular. No pueden ser alteradas por el paciente para garantizar la validez de los resultados médicos.
- **Controles de Salud:** Registro de mediciones clínicas reales comparadas contra los rangos meta mensuales.
- **Simulador Interactivo:** Proyección de reducción de riesgo a 10 y 20 años según hábitos adoptados.
- **Mi Perfil y Seguridad:** Información del participante (correo de acceso protegido no modificable) con módulo seguro para cambio de contraseña personal.

### 🛡️ Administrador del Piloto (Médico / Especialista Clínico)
- **Dashboard Global:** Métricas consolidadas del piloto, adherencia general y alertas poblacionales de Trujillo.
- **Gestión de Participantes:** Registro y edición completa de titulares.
  - **Definición de Metas e Indicadores Clínicos:** Al crear o editar un titular, el administrador define y ajusta las metas de actividad física, contacto social y los rangos de presión arterial, glucosa, colesterol e IMC. Incluye valores clínicos por defecto recomendados para agilizar el registro.
- **Reportes Analíticos:** Exportación y visualización del avance por hábitos y controles de salud.
- **Motor de Reglas:** Configuración de umbrales para disparo de alertas preventivas.

---

## 4. Credenciales de Prueba (Demo)

> **Este repositorio es público.** Estas cuentas existen solo para la demo local del piloto.
> En producción (`SEED_DATA=false`) no deben habilitarse; si se cargan, cambia las contraseñas
> en el primer ingreso y desactiva las cuentas de ejemplo.

El sistema incluye cuentas precargadas en `seed-data.sql` con hashes reales de `bcrypt`:

| Rol | Correo Electrónico | Contraseña (solo demo local) | Descripción / Participante |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@saludcerebral.pe` | `Admin123!` | Administrador Central del Piloto en Trujillo |
| **TITULAR** | `carlos.mendoza@gmail.com` | `Titular123!` | Carlos Mendoza (`P-001`), 50 años, Trujillo |
| **TITULAR 2** | `maria.flores@gmail.com` | `Titular123!` | María Flores (`P-002`), 58 años, Víctor Larco |

> **Acceso Rápido:** En `/login` hay botones de demo para entrar como Titular o Administrador. El frontend no guarda ni muestra contraseñas: llama a `POST /api/v1/auth/demo-login` y el backend firma la sesión. Requiere `DEMO_LOGIN_ENABLED=true`; si está en `false` el endpoint responde 404 y la app muestra un aviso.

---

## 5. Instalación y Despliegue Local

### Requisitos Previos
- Node.js v24 y pnpm instalado.
- Microsoft SQL Server y SQL Server Management Studio (SSMS).
- Git.

### Paso 1: Configurar la Base de Datos en SQL Server
1. Abre **SSMS** y conéctate a tu instancia local de SQL Server.
2. Abre y ejecuta el script de creación:
   ```text
   bd-sql/bd-transaccional.sql
   ```
3. A continuación, abre y ejecuta el script de datos semilla:
   ```text
   bd-sql/seed-data.sql
   ```

### Paso 2: Configurar Variables de Entorno del Backend
En `backend/.env`, verifica los parámetros de conexión:
```env
PORT=4000
NODE_ENV=development

# Autenticación con Windows (SSMS):
DB_AUTH_TYPE=windows
DB_SERVER=.
DB_DATABASE=prevencion_cognitiva_oltp
DB_ODBC_DRIVER={ODBC Driver 18 for SQL Server}

# Seguridad JWT (obligatorio: 32+ caracteres aleatorios)
# Generar con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=cambia-esto-por-un-secreto-aleatorio-de-32-o-mas-caracteres
JWT_EXPIRES_IN=7d

# CORS: vacío = solo mismo origen (recomendado). Lista separada por comas si hace falta.
CORS_ORIGINS=

# Localización
TZ=America/Lima
LOCALE=es-PE
```

### Paso 3: Validar Conexión a la Base de Datos
Comprueba que el backend se comunica con las 17 tablas:
```bash
cd backend
pnpm test:db
```

### Paso 4: Levantar los Servidores

#### Terminal 1 — Backend (API en Puerto 4000)
```bash
cd backend
pnpm dev
```

#### Terminal 2 — Frontend (Vite en Puerto 5173)
```bash
cd frontend
pnpm dev
```

Abre tu navegador en: **`http://localhost:5173`**

### Paso 5: Levantar ambas aplicaciones y ambas bases con Docker

El monorepo tiene dos aplicaciones: la transaccional y el dashboard dimensional. Con Docker se levantan las dos y una sola instancia SQL Server con dos bases (`prevencion_cognitiva_oltp` y `prevencion_cognitiva_mart`):

```bash
cp .env.example .env
# Completar MSSQL_SA_PASSWORD, JWT_SECRET y las variables BI.
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d --build
```

- Transaccional: `http://localhost:8080`
- Dashboard BI: `http://localhost:8081`
- SQL Server: `localhost:1433`

`db-init` crea/verifica el OLTP y `db-mart-init` ejecuta el ETL `01`–`05` y crea el login `bi_lector`. Si `SEED_DATA=false`, el dashboard mostrará exactamente los participantes que existan en el OLTP; no carga datos demo.

### Paso 6: Dashboard BI con datos reales

```bash
cd dashboard-bi/backend
cp .env.example .env
# DATA_SOURCE=sqlserver, BI_DB_*, ADMIN_*, JWT_SECRET
pnpm install --frozen-lockfile
pnpm hash -- "TuContraseñaSegura"   # copiar el hash a ADMIN_PASSWORD_HASH
pnpm verify:sql
pnpm dev
```

En otra terminal:

```bash
cd dashboard-bi/frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:5174`. Más detalle en `dashboard-bi/README.md`.

---

## 6. Quickstart de Despliegue en VPS (Dokploy)

Topología: `Traefik → frontend / bi-frontend (nginx :80) → backend :4000 / bi-backend :4001 → sqlserver :1433`. Una sola instancia de SQL Server contiene las dos bases: `prevencion_cognitiva_oltp` y `prevencion_cognitiva_mart`. Ningún puerto se publica al host; la exposición se define en **Domains**.

### 6.1 Prerrequisitos
- VPS Linux x86-64 con **4 GB de RAM mínimo** (SQL Server 2022 reserva ~1.5 GB). Para datos reales se recomiendan 8 GB.
- DNS: registros `A` de `saludcerebral.giansmd.dev` y `bi-saludcerebral.giansmd.dev` hacia la IP del VPS. Si el dominio está en Cloudflare, dejar la nube en **DNS only** hasta que Let's Encrypt emita el certificado.
- Repositorio privado en Dokploy. El repo público original queda como `upstream`.
- Dokploy con Docker Compose v2.20 o superior (por el `include` de `docker-compose.prod.yml`). Si tu versión no lo soporta, genera un compose único con `docker compose -f docker-compose.prod.yml config > docker-compose.dokploy.yml` y usa ese archivo.

### 6.2 Variables de entorno en Dokploy
| Variable | Ejemplo / valor |
| :--- | :--- |
| `MSSQL_SA_PASSWORD` | contraseña fuerte, mínimo 8 caracteres con mayúscula, minúscula, número y símbolo |
| `MSSQL_PID` | `Developer` |
| `MSSQL_MEMORY_LIMIT_MB` | `1536` (o `2048` si el VPS tiene 8 GB) |
| `TZ` | `America/Lima` |
| `JWT_SECRET` | cadena aleatoria de 32+ caracteres para la app transaccional |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGINS` | vacío (solo mismo origen); lista por comas solo si el frontend vive en otro dominio |
| `DEMO_LOGIN_ENABLED` | `true` solo si quieres mostrar los botones de acceso demo; `false` en producción real |
| `DB_DATABASE` | `prevencion_cognitiva_oltp` |
| `SEED_DATA` | `false` en operación real; `true` solo para la primera carga demo |
| `RESET_DB` | `false`. Con `true`, el siguiente despliegue elimina OLTP y Data Mart |
| `RESET_MART` | `false`. Con `true`, el siguiente despliegue elimina y reconstruye el Data Mart |
| `BI_DB_USER` | `bi_lector` |
| `BI_DB_PASSWORD` | contraseña fuerte del login de solo lectura; obligatoria |
| `BI_ADMIN_USER` | usuario administrador único del dashboard |
| `BI_ADMIN_PASSWORD_HASH` | hash bcrypt del administrador, entre comillas simples por los `$` |
| `BI_JWT_SECRET` | secreto JWT propio del dashboard, 32+ caracteres |
| `BI_JWT_EXPIRES_IN` | `8h` |
| `VITE_GOOGLE_MAPS_API_KEY` | opcional; clave pública restringida al subdominio del dashboard |

Notas:

- `BI_DB_PASSWORD` se usa para crear/actualizar el login SQL `bi_lector`. Debe cumplir la política de SQL Server (`CHECK_POLICY=ON`), porque `deploy/bi-login.sql` la aplica.
- Las variables BI no bloquean la app transaccional: si faltan, `db-mart-init` y `bi-backend` fallan y el dashboard no arranca, pero `sqlserver`, `db-init`, `backend` y `frontend` siguen funcionando.
- El hash bcrypt contiene `$`; en Dokploy guárdalo entre comillas simples, por ejemplo `'$2b$12$...'`. No pegues la contraseña en lugar del hash.
- Genera el hash con:
  ```bash
  cd dashboard-bi/backend
  pnpm hash -- "TuContraseñaSegura"
  ```
- No guardes secretos en el repositorio. `.env` está en `.gitignore` y `.dockerignore`.
- En el compose, la BD dimensional está en la misma instancia `sqlserver` y se llama `prevencion_cognitiva_mart`. No necesitas una variable `BI_DB_SERVER` en Dokploy.

### 6.3 Servicios y orden de arranque
El compose levanta dos aplicaciones y dos bases:

1. `sqlserver`: una instancia con dos bases.
2. `db-init` (`INIT_MODE=oltp`): crea `prevencion_cognitiva_oltp` solo si no existe y, si `SEED_DATA=true`, carga el seed. Es rápido.
3. `backend`: depende de `db-init`; la app transaccional no espera al ETL dimensional.
4. `db-mart-init` (`INIT_MODE=mart`): ejecuta `01`–`05` de `bd-dim-sql/`, carga dimensiones y hechos, valida y crea/actualiza el login `BI_DB_USER`. Es automático en cada despliegue.
5. `bi-backend`: depende de que `db-mart-init` termine correctamente. Si el ETL falla, el dashboard no arranca, pero la app transaccional sigue funcionando.
6. `frontend` y `bi-frontend`: nginx; cada una tiene su dominio.
7. `cloudbeaver`: panel de administración de las dos bases; debe quedar protegido con una segunda capa.

Los dos jobs de inicialización usan una imagen propia construida con `deploy/Dockerfile`. Los scripts `bd-sql`, `bd-dim-sql`, `deploy/init.sh` y `deploy/bi-login.sql` viajan dentro de la imagen. Así Dokploy no depende de bind mounts relativos al repositorio, que pueden quedar vacíos cuando AutoDeploy vuelve a clonar.

Comandos locales:

```bash
# Ambas apps + ambas bases, con puertos locales 8080 (transaccional) y 8081 (BI)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d --build

# Producción / Dokploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

En local, si no quieres usar Docker para las apps, puedes levantar solo SQL Server y los jobs de inicialización con `docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d sqlserver db-init db-mart-init` y ejecutar los Vite/Node por separado. El override de desarrollo publica `1433` para que el backend BI local pueda conectarse.

Si necesitas datos demo:

- Define `SEED_DATA=true` **antes del primer despliegue**. El seed solo se inserta al crear el OLTP.
- Si el OLTP ya existe, `SEED_DATA` se ignora.
- En operación real deja `SEED_DATA=false`, `RESET_DB=false` y `RESET_MART=false`.
- El seed de demostración incluye 6 semanas (5 cerradas + la actual) y 2 meses de metas, actividad, contacto, confirmaciones y resultados clínicos para Carlos, María y Jorge. Con `SEED_DATA=true` el dashboard muestra CAF, CCS y FCM desde el primer despliegue.

### 6.4 Domains en Dokploy
Configura dos subdominios independientes:

- `saludcerebral.giansmd.dev` → servicio `frontend`, puerto interno `80`.
- `bi-saludcerebral.giansmd.dev` → servicio `bi-frontend`, puerto interno `80`.

No compartas el mismo dominio entre ambas aplicaciones: las dos usan `/api` para backends distintos. El frontend transaccional sigue enrutando `/api` a `backend:4000`; el frontend BI enruta `/api` a `bi-backend:4001`.

Si usas labels manuales de Traefik, agrega `dokploy-network` a los servicios. Si usas la pestaña **Domains** de Dokploy, configura el dominio y redespliega para que Traefik lea los labels.

### 6.5 Actualizar el Data Mart
- En cada despliegue, `db-mart-init` ejecuta `01`–`05` y recarga los hechos. El dashboard espera a que termine.
- Desde la app transaccional, el administrador puede usar **Reportes Analíticos → Actualizar Data Mart**. Ejecuta `02_ETL.sql` (vistas de preparación, dimensiones y hechos) y devuelve filas cargadas, duración y fecha de corte. El endpoint es `POST /api/v1/admin/datamart/refresh` y rechaza ejecuciones simultáneas.
- Para forzar el job manualmente:
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env run --rm db-mart-init
  ```
- El dashboard cachea metadatos, filtros y respuestas durante cinco minutos (`CACHE_TTL_MS=300000`). Después de un refresco, espera ese tiempo o reinicia `bi-backend` si necesitas verlo de inmediato.
- `RESET_MART=true` elimina el Data Mart antes de reconstruirlo. Úsalo solo si el esquema quedó incompatible o si realmente quieres descartar el mart actual.

### 6.6 Panel de bases de datos (CloudBeaver)
- URL: `https://db-saludcerebral.giansmd.dev` (contenedor `cloudbeaver`, puerto interno 8978).
- **Riesgo:** el panel maneja credenciales `sa` y está en Internet. Debe tener una segunda capa: basic auth de Traefik o allowlist de IP en el middleware del dominio. Sin eso, cualquiera que descubra el host llega al login del panel.
- Usuario administrador `cbadmin`; contraseña en el gestor de secretos del equipo, nunca en el repo.
- Una sola conexión compartida `SQL Server (salud cerebral)` sobre `sqlserver:1433`, con base por defecto `prevencion_cognitiva_oltp`. El Data Mart se abre desde el árbol de bases o con el prefijo `prevencion_cognitiva_mart.dbo.`.
- En el primer uso de la conexión se piden usuario y contraseña de SQL Server; al marcar "Guardar credenciales para todos los usuarios con acceso" quedan cifradas en el volumen `cloudbeaver-data`.
- Las conexiones viven en el volumen, así que sobreviven a redeploys. El entrypoint solo siembra la plantilla en el primer arranque.

Alternativa por terminal dentro del VPS:
```bash
docker exec -it control-salud-cerebral-lmb9cv-sqlserver-1 bash
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d prevencion_cognitiva_oltp
```

### 6.7 Copias de seguridad y recuperación
- Programa copias de seguridad SQL de `prevencion_cognitiva_oltp` y `prevencion_cognitiva_mart` y almacénalas fuera del VPS. Por ejemplo, desde SQL Server:
  ```sql
  BACKUP DATABASE [prevencion_cognitiva_oltp]
    TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_oltp.bak' WITH INIT, COMPRESSION;
  BACKUP DATABASE [prevencion_cognitiva_mart]
    TO DISK = N'/var/opt/mssql/data/prevencion_cognitiva_mart.bak' WITH INIT, COMPRESSION;
  ```
  Copia los `.bak` fuera del contenedor/volumen y rota los nombres para conservar versiones. Comprueba periódicamente que una copia se pueda restaurar.
- Si `db-init` o `db-mart-init` fallan, consulta sus logs desde el primer error. No se borran datos automáticamente. Corrige la causa y vuelve a desplegar; si la inicialización dejó una base incompleta, revisa el estado de las bases o restaura una copia antes de elegir una reparación. No uses `RESET_DB=true` salvo que realmente quieras borrar OLTP y Data Mart.

### 6.8 Notas
- `msnodesqlv8` (autenticación Windows) queda como dependencia opcional: en el servidor se usa autenticación SQL con `sa`.
- El VPS debe ser Linux x86-64 y contar con al menos 4 GB de RAM; 8 GB es recomendable para datos reales.
- Los cambios del Data Mart se aplican al redesplegar; las tablas de hechos se recargan en una transacción y las dimensiones se actualizan por sus identificadores de origen.
- El dashboard BI solo lee las vistas del esquema `bi` y usa `bi_lector`, que solo tiene `SELECT` sobre ese esquema. No consulta el OLTP ni `DIM_PERSONA` directamente.
- El dashboard es solo para administrador; no tiene registro ni roles de titular.
- Los scripts del Data Mart son `01`–`05`. El dashboard no necesita los antiguos `02_Vistas_ETL`, `03_ETL_Dimensiones` y `04_ETL_Hechos`: `main` los unificó en `02_ETL.sql`.
- Si `db-mart-init` falla, `bi-backend` no arranca; la app transaccional no se ve afectada.

### 6.9 Seguridad (repo público)
Este repositorio es público: nada de lo que se commitea aquí es secreto.

- **Secretos solo en Dokploy / `.env` local.** `JWT_SECRET`, `MSSQL_SA_PASSWORD`, `BI_DB_PASSWORD`, `BI_ADMIN_PASSWORD_HASH` y `BI_JWT_SECRET` nunca se commitean. `backend/.env` está en `.gitignore` y en `.dockerignore`.
- **Sin valores por defecto para secretos.** Si falta `JWT_SECRET`, el backend no arranca (fail-closed). El dashboard BI también falla si falta su configuración.
- **CORS cerrado:** solo mismo origen. Si se necesita otro dominio, declararlo en `CORS_ORIGINS`.
- **Rate limiting:** 300 req/15 min por IP en la API, 10 intentos/15 min en login y registro, 30/15 min en el chatbot. El dashboard BI tiene su propio límite de login.
- **Contraseñas:** mínimo 8 caracteres con letra y número; hash `bcrypt` con costo 12.
- **Panel de BD (CloudBeaver):** maneja credenciales `sa`; protegerlo con basic auth de Traefik o allowlist de IP. Nunca dejarlo sin segunda capa.
- **Cuentas demo:** las contraseñas del seed son públicas. No cargar `SEED_DATA=true` en producción o cambiar las claves de inmediato.
- **Historial de git:** versiones antiguas del repo contienen un `JWT_SECRET` de ejemplo. No reutilizar ese valor; rotar el secreto de producción invalida todas las sesiones.
- **Cabeceras:** Helmet en la API transaccional y CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy` en nginx. El frontend BI todavía no replica todas las cabeceras; si se agrega CSP, debe permitir Google Charts (`https://www.gstatic.com`).

---

## 7. Reglas de Negocio y Algoritmos Clínicos

1. **Los 3 Indicadores de Cumplimiento (KPIs):**
   - **CAF (Actividad Física):** $(\text{Minutos válidos en la semana} \div \text{Meta semanal}) \times 100$.
   - **CCS (Contacto Social):** $(\text{Días únicos con contacto en la semana} \div \text{Meta semanal}) \times 100$. Múltiples interacciones en el mismo día contabilizan como un único día de estimulación.
   - **FCM (Cardiometabólico):** $(\text{Controles dentro de meta} \div \text{Total controles programados vigentes}) \times 100$.

2. **Cero Confirmado vs. Datos Pendientes:**
   - La tabla `confirmacion_diaria` almacena la confirmación explícita del participante día por día.
   - Si existen días pasados sin confirmar, el estado semanal es **`Datos pendientes`** y el indicador muestra **`—`** para evitar reportes falsos.
   - Si el participante confirma que no realizó actividad, el estado es **`0% confirmado`**.

3. **Simulador Heurístico de Riesgo a 10 y 20 Años:**
   - Ubicado en [simulador.service.ts](backend/src/services/simulador.service.ts).
   - Utiliza la **curva actuarial CAIDE** para estimar el riesgo basal por edad:
     $$\text{Riesgo Base a 10 años} = \max\left(3,\ \left(\frac{\text{edad}}{30}\right)^{2.2} \times 3\right)$$
   - Aplica el **modelo de intervención multidominio FINGER** como factores de reducción relativa del riesgo:
     - Actividad física (hasta 35% de beneficio relativo con $\ge 150$ min).
     - Contacto social (hasta 25% con $\ge 3$ días).
     - Factores cardiometabólicos (hasta 30% con 4/4 parámetros bajo control).
   - Multiplicador de riesgo acumulativo con umbral de seguridad:
     $$\text{Multiplicador} = \max(0.20,\ (1 - f_{\text{actividad}}) \times (1 - f_{\text{social}}) \times (1 - f_{\text{cardio}}))$$

4. **Integridad y Trazabilidad:**
   - Las sesiones de actividad y contactos admiten anulación lógica (`estado = 'ANULADO'`) conservando el historial de auditoría.
   - Las metas quedan registradas con versionado secuencial (`version_meta`) y origen institucional (`origen_meta = 'PROFESIONAL_SALUD'`).

---

## 8. Estructura del Proyecto

```text
Control-Salud-Cerebral/
├── bd-sql/
│   ├── bd-transaccional.sql       # Creación de tablas, claves foráneas e índices únicos
│   └── seed-data.sql              # Semillas de prueba, reglas y distritos de Trujillo
├── backend/
│   ├── src/
│   │   ├── config/                # Conexión mssql pool, variables de entorno y constantes
│   │   ├── controllers/           # Controladores REST (Auth, Hábitos, Admin, Simulador, Controles)
│   │   ├── jobs/                  # Tareas programadas con node-cron
│   │   ├── middlewares/           # Autenticación JWT y autorización RBAC
│   │   ├── repositories/          # Consultas SQL parametrizadas a las 17 tablas
│   │   ├── routes/                # Enrutador de la API (/api/v1/...)
│   │   ├── services/              # Lógica de negocio (Evaluación cerebral, KPIs, Simulador)
│   │   └── server.ts              # Servidor principal Express
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                   # Cliente Axios configurado con interceptores JWT
│   │   ├── components/            # Sidebar, Navbar, Buzón de alertas, Gauge SVG, Chatbot
│   │   ├── context/               # AuthContext (autenticación y estado de sesión)
│   │   ├── pages/
│   │   │   ├── auth/              # Inicio de sesión (1-Click Demo) y Registro
│   │   │   ├── titular/           # Dashboard, Hábitos, Controles, Simulador, Perfil y Seguridad
│   │   │   └── admin/             # Dashboard Global, Gestión de Usuarios, Reportes, Reglas
│   │   ├── types/                 # Interfaces TypeScript
│   │   ├── App.tsx                # Enrutador principal de vistas
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── bd-dim-sql/                    # Data Mart: 01 creación, 02 ETL, 03 vistas, 04 validación, 05 reportes
├── dashboard-bi/                  # Segunda aplicación: dashboard dimensional
│   ├── backend/                   # Express + mssql, solo lectura de las vistas bi.*
│   └── frontend/                  # React + Vite + Google Charts
├── deploy/
│   ├── Dockerfile                 # Imagen one-shot con los scripts de inicialización
│   ├── init.sh                    # Modos oltp/mart/all
│   └── bi-login.sql               # Login SQL de solo lectura para el dashboard
├── docker-compose.yml             # Ambas apps + ambas bases
├── docker-compose.dev.yml         # Puertos locales 8080/8081
├── docker-compose.prod.yml        # Dokploy, sin puertos publicados
└── README.md                      # Documentación completa del sistema
```