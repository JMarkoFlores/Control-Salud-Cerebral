# Prevención del Deterioro Cognitivo mediante Hábitos Diarios (G1)
> **Piloto Comunitario en Trujillo, Perú • Adultos de 30 a 65 años**

Sistema integral de salud digital, analítica preventiva y seguimiento continuo diseñado bajo principios de Arquitectura Limpia en Capas (Node.js/Express + TypeScript) y una experiencia de usuario responsiva y accesible (React + Vite + Tailwind CSS + Recharts + Lucide).

---

## 1. Stack Tecnológico

### Backend (`/backend`)
- **Runtime:** Node.js (v20+) + TypeScript
- **Framework:** Express con enrutamiento modular (`/api/v1/...`)
- **Driver de BD:** `mssql` con Connection Pooling y consultas 100% parametrizadas
- **Seguridad:** Autenticación JWT (`jsonwebtoken`) + Cifrado `bcryptjs` + RBAC estricto
- **Automatización:** Programador de tareas `node-cron` (motor diario y semanal de alertas)
- **Zona Horaria Oficial:** `America/Lima` (Perú)

### Frontend (`/frontend`)
- **Librería UI:** React 18 + Vite + TypeScript
- **Estilos:** Tailwind CSS con paleta Health-Tech (Azul Petróleo `#0F4C5C`, Verde Esmeralda `#10B981`, Ámbar `#F59E0B`, Coral `#EF4444`)
- **Visualización:** Recharts (gráficos analíticos y comparativas) + Anillo Gauge SVG de Salud Cerebral
- **Iconografía:** Lucide React
- **Asistente:** Widget Chatbot interactivo de solo lectura

### Base de Datos (`/bd-sql`)
- **Motor:** Microsoft SQL Server (SSMS Local)
- **Nombre de BD:** `prevencion_cognitiva_oltp`
- **17 Tablas Normalizadas:**
  1. `ubicacion`
  2. `persona`
  3. `cuenta_rol`
  4. `meta_semanal`
  5. `sesion_fisica`
  6. `contacto_social`
  7. `confirmacion_diaria`
  8. `control_programado`
  9. `resultado_control`
  10. `regla_alerta`
  11. `ejecucion_regla`
  12. `alerta`
  13. `evaluacion_salud_cerebral`
  14. `simulacion_riesgo`
  15. `recordatorio`
  16. `catalogo_logro`
  17. `logro_obtenido`

---

## 2. Credenciales de Prueba para los 3 Roles (Demo)

El sistema incluye hashes reales de `bcrypt` listos para probar al instante:

| Rol | Correo Electrónico | Contraseña | Descripción / Persona |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@saludcerebral.pe` | `Admin123!` | Administrador Central del Piloto en Trujillo |
| **TITULAR** | `carlos.mendoza@gmail.com` | `Titular123!` | Carlos Mendoza (`P-001`), 50 años, Trujillo |
| **ACOMPAÑANTE** | `ana.salazar@gmail.com` | `Acompanante123!` | Ana Salazar (Hija y acompañante de `P-001`) |
| **TITULAR 2** | `maria.flores@gmail.com` | `Titular123!` | María Flores (`P-002`), 58 años, Víctor Larco |

> **Nota:** La pantalla de inicio de sesión (`/login`) cuenta además con botones de **Acceso Rápido (1-Click Demo)** para cambiar de rol inmediatamente sin escribir credenciales manualmente.

---

## 3. Pasos de Instalación y Despliegue Local

### Paso 1: Configurar la Base de Datos en SQL Server (SSMS)
1. Abre **SQL Server Management Studio (SSMS)** y conéctate a tu instancia local de SQL Server.
2. Abre y ejecuta el archivo:
   ```text
   /App-Final/bd-sql/bd-transaccional.sql
   ```
   *(Este script crea la base de datos `prevencion_cognitiva_oltp` con sus 17 tablas, claves foráneas, restricciones de coherencia e índices únicos).*
3. A continuación, abre y ejecuta el archivo de datos semilla:
   ```text
   /App-Final/bd-sql/seed-data.sql
   ```
   *(Inserta los distritos de Trujillo, el catálogo de medallas, las reglas automáticas y las cuentas de prueba con sus metas y controles iniciales).*

---

### Paso 2: Configurar las Variables de Entorno del Backend
En `/App-Final/backend/`, el archivo `.env` ya viene configurado por defecto para **Autenticación de Windows** (la misma que usas en SSMS):

```env
PORT=4000
NODE_ENV=development

# Modo de autenticación: 'windows' (por defecto) o 'sql'
DB_AUTH_TYPE=windows
DB_SERVER=.
DB_DATABASE=prevencion_cognitiva_oltp
DB_ODBC_DRIVER={ODBC Driver 18 for SQL Server}

# Si prefieres usar SQL Server Authentication (sa):
# DB_AUTH_TYPE=sql
# DB_SERVER=localhost
# DB_USER=sa
# DB_PASSWORD=TuPassword123!
```

# Seguridad JWT
JWT_SECRET=super_secret_jwt_key_prevencion_cognitiva_g1_trujillo_2026
JWT_EXPIRES_IN=7d

# Localización
TZ=America/Lima
LOCALE=es-PE

# Gemini API (Opcional para respuestas generativas avanzadas en el Chatbot)
GEMINI_API_KEY=
```

---

### Paso 3: Validar Conexión y Accesibilidad a las 17 Tablas
Para comprobar que el backend se conecta correctamente y que todas las tablas existen, ejecuta:

```bash
cd backend
npm run test:db
```

Si todo es correcto, la consola mostrará:
```text
=============================================================
VERIFICACIÓN DE CONEXIÓN A BASE DE DATOS (SQL SERVER)
=============================================================
✅ Conexión exitosa con el servidor SQL Server.

--- Verificación de las 17 tablas transaccionales ---
  [OK] Tabla 'ubicacion                 ' accesible. Registros: 6
  [OK] Tabla 'persona                   ' accesible. Registros: 4
  [OK] Tabla 'cuenta_rol                ' accesible. Registros: 4
  ...
🎉 ¡EXCELENTE! Las 17 tablas de prevencion_cognitiva_oltp están 100% verificadas.
```

*(Opcional: Si prefieres cargar los seeds desde terminal en lugar de SSMS, puedes ejecutar `npm run db:seed`).*

---

### Paso 4: Levantar los Servidores

#### Terminal 1 — Backend (Puerto 4000)
```bash
cd backend
npm run dev
```
> El servidor quedará escuchando en `http://localhost:4000` y activará el motor automático `node-cron` para alertas.

#### Terminal 2 — Frontend (Puerto 5173)
```bash
cd frontend
npm run dev
```
> Abre tu navegador en `http://localhost:5173`.

---

## 4. Reglas de Negocio Implementadas (Fuente Única de Verdad)

1. **Los 3 Indicadores (KPIs):**
   - **CAF (Actividad Física):** `(Minutos válidos en la semana ÷ Meta semanal) × 100`.
   - **CCS (Contacto Social):** `(Días únicos con contacto en la semana ÷ Meta semanal) × 100`. Varios contactos en un mismo día cuentan como 1 solo día.
   - **FCM (Cardiometabólico):** `(Controles en meta del mes ÷ Total controles programados vigentes) × 100`.
2. **Cero Confirmado vs. Datos Pendientes:**
   - La tabla `confirmacion_diaria` almacena la confirmación explícita de cada día de la semana.
   - Si quedan días pasados sin confirmar, el estado semanal es **`Datos pendientes`** y el indicador muestra **`—`** (evitando porcentajes erróneos).
   - Si el participante confirma que no realizó actividad, el estado es **`Sin actividad/contacto confirmado`** (`0%`).
3. **Escala de Estados Motivadora:**
   - `≥ 80%` $\rightarrow$ **¡Meta lograda! / Excelente** (Verde `#10B981`)
   - `50% – 79.9%` $\rightarrow$ **En progreso** (Ámbar `#F59E0B`)
   - `> 0% – 49.9%` $\rightarrow$ **Avance inicial** (Naranja `#F97316`)
   - `0% confirmado` $\rightarrow$ **Sin actividad/contacto** (Coral suave `#EF4444`)
4. **Subtotales Evaluables en Reportes:**
   - En los reportes de administración se excluyen estrictamente los registros con `Datos pendientes` y `Sin meta`, calculando la suma agregada de numeradores y denominadores del subtotal elegible.
5. **Simulador de Riesgo a 10 y 20 Años:**
   - Modelo de proyección preventiva multidominio (FINGER / CAIDE adaptado a adultos de 30 a 65 años) que calcula la reducción de riesgo relativo según minutos semanales, interacción social y factores metabólicos controlados.
6. **Trazabilidad y Anulación Lógica (Soft Delete):**
   - Para corregir registros erróneos en sesiones físicas y contactos sociales, se utiliza `estado = 'ANULADO'` en lugar de borrado físico `DELETE`, excluyéndolos de los cálculos de forma inmediata.
7. **Motor de Alertas y Notificaciones:**
   - Ejecutado de manera programada (`08:00`, `21:00` y domingos `23:30`) y con verificación ligera al inicio de sesión.
   - Incluye regla `REG-04` de motivación diaria con textos cercanos y afectuosos para los participantes de Trujillo.
8. **Chatbot Asistente:**
   - Widget flotante interactivo que consulta vía API autenticada del backend los KPIs y pendientes en tiempo real sin inventar información.

---

## 5. Estructura del Directorio

```text
App-Final/
├── bd-sql/
│   ├── bd-transaccional.sql       # DDL completo con las 17 tablas actualizadas
│   └── seed-data.sql              # Seeds con hashes bcrypt y distritos de Trujillo
├── backend/
│   ├── src/
│   │   ├── config/                # Base de datos (mssql pool), variables de entorno, constantes
│   │   ├── controllers/           # Controladores de Auth, Dashboard, Hábitos, Controles, Simulador, etc.
│   │   ├── jobs/                  # Tareas automáticas node-cron (Alertas matutinas, nocturnas y de cierre)
│   │   ├── middlewares/           # JWT, RBAC por rol, validación Zod, manejo de errores
│   │   ├── repositories/          # Consultas SQL parametrizadas a las 17 tablas
│   │   ├── routes/                # Enrutador modular /api/v1/...
│   │   ├── scripts/               # npm run test:db y npm run db:seed
│   │   ├── services/              # Lógica de KPIs (CAF, CCS, FCM), Evaluaciones, Simulador, Chatbot
│   │   ├── utils/                 # Fechas en formato Lunes a Domingo y zona America/Lima
│   │   └── server.ts              # Entry point Express
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                   # Cliente Axios con interceptor JWT
│   │   ├── components/            # Navbar con Buzón, Sidebar responsivo, Gauge, KpiCard, ChatbotWidget
│   │   ├── context/               # AuthContext (roles, sesión, login/logout)
│   │   ├── pages/
│   │   │   ├── auth/              # Login (con 1-click demo) y Registro de Titulares
│   │   │   ├── titular/           # Dashboard, Hábitos, Controles, Simulador, Recordatorios, Logros, Perfil
│   │   │   ├── acompanante/       # Dashboard Solo Lectura y Alertas para familiares
│   │   │   └── admin/             # Dashboard Global, Usuarios, Reportes (PDF/CSV), Reglas, Catálogos
│   │   ├── types/                 # Definiciones TypeScript compartidas
│   │   ├── App.tsx                # Enrutador principal y layout
│   │   ├── main.tsx
│   │   └── index.css              # Estilos Tailwind CSS
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md                      # Documentación completa del proyecto
```
