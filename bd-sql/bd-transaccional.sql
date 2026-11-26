-- =============================================================================
-- SCRIPT FINAL COMPLETO DESDE CERO (SQL SERVER / T-SQL)
-- Base de Datos Transaccional: prevencion_cognitiva_oltp (17 Tablas)
-- Proyecto: Prevención del Deterioro Cognitivo mediante Hábitos Diarios (G1)
-- =============================================================================

IF DB_ID('prevencion_cognitiva_oltp') IS NULL
BEGIN
    CREATE DATABASE prevencion_cognitiva_oltp;
END
GO

USE prevencion_cognitiva_oltp;
GO

-- -----------------------------------------------------------------------------
-- 1. UBICACION (Ámbito geográfico y piloto en Trujillo)
-- -----------------------------------------------------------------------------
CREATE TABLE ubicacion (
    ubicacion_id INT IDENTITY(1,1) PRIMARY KEY,
    pais         VARCHAR(60) NOT NULL DEFAULT 'Perú',
    departamento VARCHAR(80) NOT NULL,
    provincia    VARCHAR(80) NOT NULL,
    distrito     VARCHAR(80) NOT NULL,
    CONSTRAINT uq_ubicacion UNIQUE (pais, departamento, provincia, distrito)
);
GO


-- -----------------------------------------------------------------------------
-- 2. PERSONA (Titular del seguimiento: 30 a 65 años)
-- -----------------------------------------------------------------------------
CREATE TABLE persona (
    persona_id       INT IDENTITY(1,1) PRIMARY KEY,
    codigo_interno   VARCHAR(20) NOT NULL UNIQUE, -- Ej. P-001 (anonimización TRA-02)
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo             CHAR(1) CHECK (sexo IN ('M', 'F', 'O')),
    ubicacion_id     INT NOT NULL REFERENCES ubicacion(ubicacion_id),
    fecha_alta       DATETIME2 NOT NULL DEFAULT GETDATE(),
    activo           BIT NOT NULL DEFAULT 1
);
GO


-- -----------------------------------------------------------------------------
-- 3. CUENTA_ROL (Login único Web/Android y permisos por rol - TRA-02)
-- -----------------------------------------------------------------------------
CREATE TABLE cuenta_rol (
    cuenta_id          INT IDENTITY(1,1) PRIMARY KEY,
    persona_titular_id INT NOT NULL REFERENCES persona(persona_id),
    correo_acceso      VARCHAR(120) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    rol                VARCHAR(20) NOT NULL CHECK (rol IN ('TITULAR', 'ADMIN')),
    autorizado         BIT NOT NULL DEFAULT 1,
    nombre_contacto    VARCHAR(100) NULL,
    parentesco         VARCHAR(50) NULL,
    fecha_inicio       DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    fecha_fin          DATE NULL
);
GO


-- -----------------------------------------------------------------------------
-- 4. META_SEMANAL (Metas de actividad y contacto con control de versiones)
-- -----------------------------------------------------------------------------
CREATE TABLE meta_semanal (
    meta_id        INT IDENTITY(1,1) PRIMARY KEY,
    persona_id     INT NOT NULL REFERENCES persona(persona_id),
    habito         VARCHAR(25) NOT NULL CHECK (habito IN ('ACTIVIDAD_FISICA', 'CONTACTO_SOCIAL')),
    inicio_semana  DATE NOT NULL, -- Lunes de la semana
    valor_meta     INT NOT NULL CHECK (valor_meta > 0),
    unidad         VARCHAR(20) NOT NULL CHECK (unidad IN ('MINUTOS', 'DIAS')),
    version_meta   INT NOT NULL DEFAULT 1,
    origen_meta    VARCHAR(30) NOT NULL CHECK (origen_meta IN ('PERSONAL', 'PROFESIONAL_SALUD', 'ACORDADA')),
    vigente        BIT NOT NULL DEFAULT 1,
    fecha_registro DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_meta_version UNIQUE (persona_id, habito, inicio_semana, version_meta),
    CONSTRAINT ck_meta_coherencia CHECK (
        (habito = 'ACTIVIDAD_FISICA' AND unidad = 'MINUTOS' AND valor_meta > 0) OR
        (habito = 'CONTACTO_SOCIAL'  AND unidad = 'DIAS'    AND valor_meta BETWEEN 1 AND 7)
    )
);
GO


CREATE UNIQUE INDEX uq_meta_semanal_vigente
    ON meta_semanal (persona_id, habito, inicio_semana)
    WHERE vigente = 1;
GO

-- -----------------------------------------------------------------------------
-- 5. SESION_FISICA (Registro diario de actividad física)
-- -----------------------------------------------------------------------------
CREATE TABLE sesion_fisica (
    sesion_id        INT IDENTITY(1,1) PRIMARY KEY,
    persona_id       INT NOT NULL REFERENCES persona(persona_id),
    fecha_hora       DATETIME2 NOT NULL,
    tipo_actividad   VARCHAR(40) NOT NULL CHECK (tipo_actividad IN ('Caminata', 'Ejercicio', 'Deporte', 'Otro')),
    duracion_minutos INT NOT NULL CHECK (duracion_minutos > 0),
    origen           VARCHAR(25) NOT NULL CHECK (origen IN ('Autorreporte', 'Dispositivo', 'Otro')),
    estado           VARCHAR(20) NOT NULL DEFAULT 'VALIDO' CHECK (estado IN ('VALIDO', 'ANULADO'))
);
GO


-- -----------------------------------------------------------------------------
-- 6. CONTACTO_SOCIAL (Registro diario de interacciones sociales)
-- -----------------------------------------------------------------------------
CREATE TABLE contacto_social (
    contacto_id INT IDENTITY(1,1) PRIMARY KEY,
    persona_id  INT NOT NULL REFERENCES persona(persona_id),
    fecha_hora  DATETIME2 NOT NULL,
    modalidad   VARCHAR(40) NOT NULL CHECK (modalidad IN ('Llamadas', 'Visita familiar', 'Conversación presencial', 'Videollamada', 'Otro')),
    origen      VARCHAR(25) NOT NULL CHECK (origen IN ('Autorreporte', 'Dispositivo', 'Otro')),
    estado      VARCHAR(20) NOT NULL DEFAULT 'VALIDO' CHECK (estado IN ('VALIDO', 'ANULADO'))
);
GO


-- -----------------------------------------------------------------------------
-- 7. CONFIRMACION_DIARIA (Distingue 0% confirmado vs. Datos pendientes)
-- -----------------------------------------------------------------------------
CREATE TABLE confirmacion_diaria (
    confirmacion_id     INT IDENTITY(1,1) PRIMARY KEY,
    persona_id          INT NOT NULL REFERENCES persona(persona_id),
    fecha               DATE NOT NULL,
    habito              VARCHAR(25) NOT NULL CHECK (habito IN ('ACTIVIDAD_FISICA', 'CONTACTO_SOCIAL')),
    estado_confirmacion VARCHAR(30) NOT NULL CHECK (estado_confirmacion IN ('CONFIRMADO_CON_REGISTRO', 'CONFIRMADO_SIN_ACTIVIDAD', 'PENDIENTE')),
    fecha_confirmacion  DATETIME2 NULL,
    CONSTRAINT uq_confirmacion_diaria UNIQUE (persona_id, fecha, habito)
);
GO


-- -----------------------------------------------------------------------------
-- 8. CONTROL_PROGRAMADO (Agenda mensual de factores cardiometabólicos)
-- -----------------------------------------------------------------------------
CREATE TABLE control_programado (
    control_id           INT IDENTITY(1,1) PRIMARY KEY,
    persona_id           INT NOT NULL REFERENCES persona(persona_id),
    tipo_control         VARCHAR(30) NOT NULL CHECK (tipo_control IN ('Presión arterial', 'Glucosa', 'Colesterol LDL', 'IMC')),
    mes_periodo          DATE NOT NULL, -- Primer día del mes (ej. 2026-11-01)
    fecha_prevista       DATE NOT NULL,
    criterio_meta_texto  VARCHAR(80) NOT NULL,
    valor_meta_min       NUMERIC(6,2) NULL, -- Para rangos completos (ej. IMC 18.5-24.9)
    valor_meta_max       NUMERIC(6,2) NULL,
    valor_meta_max_diast NUMERIC(6,2) NULL, -- Solo para presión diastólica
    unidad               VARCHAR(20) NOT NULL,
    vigente              BIT NOT NULL DEFAULT 1,
    CONSTRAINT uq_control_mes UNIQUE (persona_id, tipo_control, mes_periodo)
);
GO


-- -----------------------------------------------------------------------------
-- 9. RESULTADO_CONTROL (Mediciones clínicas: con control previsto o sin meta)
-- -----------------------------------------------------------------------------
CREATE TABLE resultado_control (
    resultado_id     INT IDENTITY(1,1) PRIMARY KEY,
    control_id       INT NULL REFERENCES control_programado(control_id), -- NULL si se registra sin meta
    persona_id       INT NOT NULL REFERENCES persona(persona_id),
    tipo_control     VARCHAR(30) NOT NULL CHECK (tipo_control IN ('Presión arterial', 'Glucosa', 'Colesterol LDL', 'IMC')),
    fecha_medicion   DATETIME2 NOT NULL,
    valor_numerico   NUMERIC(6,2) NULL, -- Glucosa, LDL, IMC
    valor_sistolica  NUMERIC(5,1) NULL, -- Presión arterial (sistólica)
    valor_diastolica NUMERIC(5,1) NULL, -- Presión arterial (diastólica)
    unidad           VARCHAR(20) NOT NULL,
    origen           VARCHAR(25) NOT NULL CHECK (origen IN ('Autorreporte', 'Dispositivo', 'Laboratorio', 'Otro')),
    validado         BIT NOT NULL DEFAULT 1,
    es_referencia    BIT NOT NULL DEFAULT 0,
    dentro_de_meta   BIT NULL, -- NULL si no tiene meta asociada
    CONSTRAINT ck_resultado_tipo_valor CHECK (
        (tipo_control = 'Presión arterial' AND valor_sistolica IS NOT NULL AND valor_diastolica IS NOT NULL) OR
        (tipo_control <> 'Presión arterial' AND valor_numerico IS NOT NULL)
    )
);
GO


CREATE UNIQUE INDEX uq_resultado_referencia
    ON resultado_control (control_id)
    WHERE es_referencia = 1 AND control_id IS NOT NULL;
GO

-- -----------------------------------------------------------------------------
-- 10. REGLA_ALERTA (Catálogo de reglas automáticas de seguimiento)
-- -----------------------------------------------------------------------------
CREATE TABLE regla_alerta (
    regla_id        INT IDENTITY(1,1) PRIMARY KEY,
    codigo_regla    VARCHAR(30) NOT NULL UNIQUE,
    nombre_regla    VARCHAR(100) NOT NULL,
    version_regla   VARCHAR(10) NOT NULL DEFAULT '1.0',
    frecuencia      VARCHAR(20) NOT NULL CHECK (frecuencia IN ('DIARIA', 'SEMANAL', 'MENSUAL')),
    tipo_activacion VARCHAR(40) NOT NULL,
    activa          BIT NOT NULL DEFAULT 1
);
GO


-- -----------------------------------------------------------------------------
-- 11. EJECUCION_REGLA (Auditoría de ejecuciones del motor de alertas)
-- -----------------------------------------------------------------------------
CREATE TABLE ejecucion_regla (
    ejecucion_id      INT IDENTITY(1,1) PRIMARY KEY,
    regla_id          INT NOT NULL REFERENCES regla_alerta(regla_id),
    fecha_ejecucion   DATETIME2 NOT NULL DEFAULT GETDATE(),
    resultado_estado  VARCHAR(20) NOT NULL CHECK (resultado_estado IN ('EXITOSO', 'ERROR')),
    alertas_generadas INT NOT NULL DEFAULT 0
);
GO


-- -----------------------------------------------------------------------------
-- 12. ALERTA (Bandeja de alertas sin duplicados - ALE-01)
-- -----------------------------------------------------------------------------
CREATE TABLE alerta (
    alerta_id              INT IDENTITY(1,1) PRIMARY KEY,
    persona_id             INT NOT NULL REFERENCES persona(persona_id),
    regla_id               INT NOT NULL REFERENCES regla_alerta(regla_id),
    ejecucion_id           INT NOT NULL REFERENCES ejecucion_regla(ejecucion_id),
    tipo_seguimiento       VARCHAR(30) NOT NULL CHECK (tipo_seguimiento IN ('ACTIVIDAD_FISICA', 'CONTACTO_SOCIAL', 'CONTROL_CARDIOMETABOLICO')),
    control_id             INT NULL REFERENCES control_programado(control_id),
    control_id_unico       AS ISNULL(control_id, 0) PERSISTED,
    periodo_referencia     VARCHAR(20) NOT NULL,
    motivo                 VARCHAR(60) NOT NULL CHECK (motivo IN ('Dato sin confirmar', 'Meta semanal sin alcanzar', 'Control vencido sin resultado', 'Motivación diaria')),
    mensaje                VARCHAR(250) NULL,
    destinatario_cuenta_id INT NOT NULL REFERENCES cuenta_rol(cuenta_id),
    rol_destinatario       VARCHAR(20) NOT NULL CHECK (rol_destinatario IN ('TITULAR', 'ADMIN')),
    estado                 VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ATENDIDA', 'CERRADA')),
    fecha_emision          DATETIME2 NOT NULL DEFAULT GETDATE(),
    fecha_atencion         DATETIME2 NULL
);
GO


CREATE UNIQUE INDEX uq_alerta_unica
    ON alerta (persona_id, regla_id, tipo_seguimiento, control_id_unico, periodo_referencia, destinatario_cuenta_id);
GO


-- -----------------------------------------------------------------------------
-- 13. EVALUACION_SALUD_CEREBRAL (Puntaje de salud cerebral del tablero)
-- -----------------------------------------------------------------------------
CREATE TABLE evaluacion_salud_cerebral (
    evaluacion_id            INT IDENTITY(1,1) PRIMARY KEY,
    persona_id               INT NOT NULL REFERENCES persona(persona_id),
    fecha_evaluacion         DATETIME2 NOT NULL DEFAULT GETDATE(),
    periodo_referencia       VARCHAR(20) NOT NULL,
    puntaje_total            NUMERIC(5,2) NOT NULL CHECK (puntaje_total BETWEEN 0 AND 100),
    puntaje_actividad        NUMERIC(5,2) NOT NULL CHECK (puntaje_actividad BETWEEN 0 AND 100),
    puntaje_social           NUMERIC(5,2) NOT NULL CHECK (puntaje_social BETWEEN 0 AND 100),
    puntaje_cardiometabolico NUMERIC(5,2) NOT NULL CHECK (puntaje_cardiometabolico BETWEEN 0 AND 100),
    categoria_riesgo         VARCHAR(20) NOT NULL CHECK (categoria_riesgo IN ('BAJO', 'MODERADO', 'ALTO')),
    version_algoritmo        VARCHAR(20) NOT NULL DEFAULT 'v1.0'
);
GO

CREATE UNIQUE INDEX uq_evaluacion_persona_periodo
    ON evaluacion_salud_cerebral (persona_id, periodo_referencia);
GO


-- -----------------------------------------------------------------------------
-- 14. SIMULACION_RIESGO (Simulaciones interactivas a 10 y 20 años)
-- -----------------------------------------------------------------------------
CREATE TABLE simulacion_riesgo (
    simulacion_id            INT IDENTITY(1,1) PRIMARY KEY,
    persona_id               INT NOT NULL REFERENCES persona(persona_id),
    evaluacion_base_id       INT NULL REFERENCES evaluacion_salud_cerebral(evaluacion_id),
    nombre_escenario         VARCHAR(80) NOT NULL,
    minutos_simulados_sem    INT NOT NULL CHECK (minutos_simulados_sem >= 0),
    dias_contacto_simulados  INT NOT NULL CHECK (dias_contacto_simulados BETWEEN 0 AND 7),
    factores_controlados_sim INT NOT NULL CHECK (factores_controlados_sim BETWEEN 0 AND 4),
    puntaje_proyectado       NUMERIC(5,2) NOT NULL CHECK (puntaje_proyectado BETWEEN 0 AND 100),
    riesgo_10_anios_pct      NUMERIC(5,2) NOT NULL CHECK (riesgo_10_anios_pct BETWEEN 0 AND 100),
    riesgo_20_anios_pct      NUMERIC(5,2) NOT NULL CHECK (riesgo_20_anios_pct BETWEEN 0 AND 100),
    fecha_simulacion         DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO


-- -----------------------------------------------------------------------------
-- 15. RECORDATORIO (Avisos configurables y pausables por el usuario)
-- -----------------------------------------------------------------------------
CREATE TABLE recordatorio (
    recordatorio_id     INT IDENTITY(1,1) PRIMARY KEY,
    persona_id          INT NOT NULL REFERENCES persona(persona_id),
    tipo_aviso          VARCHAR(30) NOT NULL CHECK (tipo_aviso IN ('ACTIVIDAD_FISICA', 'CONTACTO_SOCIAL', 'CONTROL_SALUD', 'CONFIRMACION_DIARIA')),
    hora_programada     TIME NOT NULL,
    dias_semana         VARCHAR(25) NOT NULL DEFAULT 'L,M,X,J,V,S,D',
    estado              VARCHAR(15) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'PAUSADO')),
    destino_tipo        VARCHAR(30) NOT NULL CHECK (destino_tipo IN ('REGISTRO_ACTIVIDAD', 'REGISTRO_CONTACTO', 'CONFIRMACION_DIARIA', 'CONTROL_PROGRAMADO', 'META_SEMANAL')),
    destino_registro_id INT NULL,
    fecha_creacion      DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO


-- -----------------------------------------------------------------------------
-- 16. CATALOGO_LOGRO (Definición de logros de la aplicación)
-- -----------------------------------------------------------------------------
CREATE TABLE catalogo_logro (
    logro_id     INT IDENTITY(1,1) PRIMARY KEY,
    codigo_logro VARCHAR(40) NOT NULL UNIQUE,
    nombre       VARCHAR(80) NOT NULL,
    descripcion  VARCHAR(200) NOT NULL,
    activo       BIT NOT NULL DEFAULT 1
);
GO


-- -----------------------------------------------------------------------------
-- 17. LOGRO_OBTENIDO (Historial de logros: máximo 1 vez por persona y periodo)
-- -----------------------------------------------------------------------------
CREATE TABLE logro_obtenido (
    logro_obtenido_id  INT IDENTITY(1,1) PRIMARY KEY,
    persona_id         INT NOT NULL REFERENCES persona(persona_id),
    logro_id           INT NOT NULL REFERENCES catalogo_logro(logro_id),
    periodo_referencia VARCHAR(20) NOT NULL,
    fecha_obtencion    DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_logro_persona_periodo UNIQUE (persona_id, logro_id, periodo_referencia)
);
GO

--CREATE UNIQUE INDEX uq_evaluacion_persona_periodo
--    ON evaluacion_salud_cerebral (persona_id, periodo_referencia);
--GO