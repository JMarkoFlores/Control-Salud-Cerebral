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
6. [Reglas de Negocio y Algoritmos Clínicos](#6-reglas-de-negocio-y-algoritmos-clínicos)
7. [Estructura del Proyecto](#7-estructura-del-proyecto)

---

## 1. Descripción General

El proyecto **Control de Salud Cerebral** tiene como objetivo prevenir y mitigar el riesgo de deterioro cognitivo y demencias en adultos de 30 a 65 años mediante el fortalecimiento de tres pilares fundamentales de la reserva neurocognitiva:

1. **Actividad Física Regular:** Registro y control de minutos semanales de ejercicio (caminata, deportes, entrenamientos).
2. **Contacto Social Significativo:** Seguimiento de interacciones cara a cara, familiares y comunitarias para estimulación afectiva y cognitiva.
3. **Control Cardiometabólico:** Vigilancia periódica de factores de riesgo vascular (presión arterial sistólica/diastólica, glucosa en ayunas, colesterol LDL e IMC).

---

## 2. Stack Tecnológico

### Backend (`/backend`)
- **Runtime:** Node.js (v20+) con TypeScript en modo estricto.
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

El sistema incluye cuentas precargadas en `seed-data.sql` con hashes reales de `bcrypt`:

| Rol | Correo Electrónico | Contraseña | Descripción / Participante |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@saludcerebral.pe` | `Admin123!` | Administrador Central del Piloto en Trujillo |
| **TITULAR** | `carlos.mendoza@gmail.com` | `Titular123!` | Carlos Mendoza (`P-001`), 50 años, Trujillo |
| **TITULAR 2** | `maria.flores@gmail.com` | `Titular123!` | María Flores (`P-002`), 58 años, Víctor Larco |

> **Acceso Rápido:** En la pantalla de inicio de sesión (`/login`), dispones de botones de acceso rápido de prueba para iniciar sesión con un solo clic como Titular o Administrador.

---

## 5. Instalación y Despliegue Local

### Requisitos Previos
- Node.js v18 o superior instalado.
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

# Seguridad JWT
JWT_SECRET=super_secret_jwt_key_prevencion_cognitiva_g1_trujillo_2026
JWT_EXPIRES_IN=7d

# Localización
TZ=America/Lima
LOCALE=es-PE
```

### Paso 3: Validar Conexión a la Base de Datos
Comprueba que el backend se comunica con las 17 tablas:
```bash
cd backend
npm run test:db
```

### Paso 4: Levantar los Servidores

#### Terminal 1 — Backend (API en Puerto 4000)
```bash
cd backend
npm run dev
```

#### Terminal 2 — Frontend (Vite en Puerto 5173)
```bash
cd frontend
npm run dev
```

Abre tu navegador en: **`http://localhost:5173`**

---

## 6. Reglas de Negocio y Algoritmos Clínicos

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

## 7. Estructura del Proyecto

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
└── README.md                      # Documentación completa del sistema
```
