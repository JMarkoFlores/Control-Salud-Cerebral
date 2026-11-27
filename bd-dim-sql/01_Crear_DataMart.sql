-- G1 | PASO 01. CREACIÓN DE LA BASE DIMENSIONAL (SQL Server 2022).
-- KEY = llave sustituta de la dimensión; ID = identificador del OLTP.
-- PK = clave primaria, FK = clave foránea, UQ = valor o combinación única.
-- El Data Mart contiene exactamente seis dimensiones y dos hechos.
-- Ejecutar en la misma instancia que prevencion_cognitiva.
USE [master];
GO
IF DB_ID(N'prevencion_cognitiva') IS NULL
    THROW 50001, N'No existe la BD transaccional prevencion_cognitiva.', 1;
GO
IF DB_ID(N'prevencion_cognitiva_mart') IS NULL
    CREATE DATABASE [prevencion_cognitiva_mart];
GO
USE [prevencion_cognitiva_mart];
GO
-- bi: vistas y procedimientos de reportes; no contiene tablas.
IF SCHEMA_ID(N'bi') IS NULL
    EXEC(N'CREATE SCHEMA [bi] AUTHORIZATION [dbo];');
GO

-- D1. El ID de origen es la PK de persona; la llave sustituta es local al Mart.
IF OBJECT_ID(N'[dbo].[DIM_PERSONA]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_PERSONA] (
    key_persona       INT IDENTITY(1, 1) NOT NULL,
    estado            NVARCHAR(10) NOT NULL,
    grupo_edad        NVARCHAR(20) NOT NULL, -- Grupo al corte de carga; BI lo recalcula por periodo.
    fecha_nacimiento  DATE NOT NULL,
    fecha_alta        DATETIME2 NOT NULL,
    sexo              CHAR(1) NULL,
    codigo_interno    NVARCHAR(20) NOT NULL,
    nombres           NVARCHAR(100) NOT NULL,
    apellidos         NVARCHAR(100) NOT NULL,
    id_persona        INT NOT NULL,

    CONSTRAINT PK_DIM_PERSONA PRIMARY KEY (key_persona),
    CONSTRAINT UQ_DIM_PERSONA UNIQUE (id_persona)
);
GO

-- D2. Una fila por fecha. El ID es la fecha de negocio, no una PK OLTP ficticia.
IF OBJECT_ID(N'[dbo].[DIM_TIEMPO]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_TIEMPO] (
    key_tiempo        INT IDENTITY(1, 1) NOT NULL,
    anio              SMALLINT NOT NULL,
    trimestre         TINYINT NOT NULL,
    mes               TINYINT NOT NULL,
    nombre_mes        NVARCHAR(12) NOT NULL,
    anio_semana_iso   SMALLINT NOT NULL,
    semana_iso        TINYINT NOT NULL,
    inicio_semana     DATE NOT NULL,
    inicio_mes        DATE NOT NULL,
    dia               TINYINT NOT NULL,
    dia_semana        NVARCHAR(12) NOT NULL,
    id_tiempo         DATE NOT NULL,

    CONSTRAINT PK_DIM_TIEMPO PRIMARY KEY (key_tiempo),
    CONSTRAINT UQ_DIM_TIEMPO UNIQUE (id_tiempo)
);
GO

-- D3. Ciudad no existe en el OLTP; se conserva NULL hasta contar con una fuente.
IF OBJECT_ID(N'[dbo].[DIM_UBICACION]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_UBICACION] (
    key_ubicacion     INT IDENTITY(1, 1) NOT NULL,
    pais              NVARCHAR(60) NOT NULL,
    departamento      NVARCHAR(80) NOT NULL,
    provincia         NVARCHAR(80) NOT NULL,
    ciudad            NVARCHAR(80) NULL,
    distrito          NVARCHAR(80) NOT NULL,
    id_ubicacion      INT NOT NULL,

    CONSTRAINT PK_DIM_UBICACION PRIMARY KEY (key_ubicacion),
    CONSTRAINT UQ_DIM_UBICACION UNIQUE (id_ubicacion)
);
GO

-- D4. Catálogo conformado por los dos hábitos y los cuatro tipos de control.
IF OBJECT_ID(N'[dbo].[DIM_TIPO_SEGUIMIENTO]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_TIPO_SEGUIMIENTO] (
    key_tipo_seguimiento INT IDENTITY(1, 1) NOT NULL,
    periodicidad         NVARCHAR(10) NOT NULL,
    tipo_seguimiento     NVARCHAR(40) NOT NULL,
    tipo_control         NVARCHAR(30) NULL,
    unidad_medida        NVARCHAR(20) NOT NULL,
    id_tipo_seguimiento  NVARCHAR(30) NOT NULL,

    CONSTRAINT PK_DIM_TIPO_SEGUIMIENTO PRIMARY KEY (key_tipo_seguimiento),
    CONSTRAINT UQ_DIM_TIPO_SEGUIMIENTO UNIQUE (id_tipo_seguimiento)
);
GO

-- D5. Combinaciones de origen, validación y referencia; incluye ausencia de resultado.
IF OBJECT_ID(N'[dbo].[DIM_ORIGEN_RESULTADO]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_ORIGEN_RESULTADO] (
    key_origen_resultado INT IDENTITY(1, 1) NOT NULL,
    origen_resultado     NVARCHAR(25) NOT NULL,
    estado_validacion    NVARCHAR(20) NOT NULL,
    resultado_referencia BIT NULL,
    id_origen_resultado  NVARCHAR(50) NOT NULL,

    CONSTRAINT PK_DIM_ORIGEN_RESULTADO PRIMARY KEY (key_origen_resultado),
    CONSTRAINT UQ_DIM_ORIGEN_RESULTADO UNIQUE (id_origen_resultado)
);
GO

-- D6. SEM:<meta_id> y CTRL:<control_id> distinguen dos fuentes con IDs que pueden coincidir.
-- El valor semanal es M2/M4, no un atributo de esta dimensión.
IF OBJECT_ID(N'[dbo].[DIM_META]', N'U') IS NULL
CREATE TABLE [dbo].[DIM_META] (
    key_meta           INT IDENTITY(1, 1) NOT NULL,
    tipo_meta          NVARCHAR(20) NOT NULL,
    criterio_meta      NVARCHAR(100) NULL,
    unidad             NVARCHAR(20) NULL,
    origen_meta        NVARCHAR(30) NULL,
    version_meta       INT NULL,
    vigente            BIT NULL,
    inicio_vigencia    DATE NULL,
    fecha_prevista     DATE NULL,
    fecha_registro     DATETIME2 NULL,
    valor_meta_min     DECIMAL(6, 2) NULL,
    valor_meta_max     DECIMAL(6, 2) NULL,
    valor_meta_max_diast DECIMAL(6, 2) NULL,
    id_meta            NVARCHAR(40) NOT NULL,

    CONSTRAINT PK_DIM_META PRIMARY KEY (key_meta),
    CONSTRAINT UQ_DIM_META UNIQUE (id_meta)
);
GO

-- HECHO 1. La PK está formada por las cinco FK.
-- Grano: una persona, un lunes de semana, un hábito.
-- M1/M2 sólo aplican a actividad física; M3/M4 sólo a contacto social.
IF OBJECT_ID(N'[dbo].[FACT_HABITOS_SEMANALES]', N'U') IS NULL
CREATE TABLE [dbo].[FACT_HABITOS_SEMANALES] (
    key_persona          INT NOT NULL,
    key_tiempo           INT NOT NULL,
    key_ubicacion        INT NOT NULL,
    key_tipo_seguimiento INT NOT NULL,
    key_meta             INT NOT NULL,
    minutos_realizados   BIGINT NULL, -- M1
    meta_minutos_semanal INT NULL,    -- M2
    dias_con_contacto    INT NULL,    -- M3
    meta_dias_semanal    INT NULL,    -- M4
    estado_datos         VARCHAR(20) NOT NULL,
    fecha_corte          DATE NOT NULL,

    CONSTRAINT FK_HABITOS_PERSONA FOREIGN KEY (key_persona)
        REFERENCES [dbo].[DIM_PERSONA](key_persona),
    CONSTRAINT FK_HABITOS_TIEMPO FOREIGN KEY (key_tiempo)
        REFERENCES [dbo].[DIM_TIEMPO](key_tiempo),
    CONSTRAINT FK_HABITOS_UBICACION FOREIGN KEY (key_ubicacion)
        REFERENCES [dbo].[DIM_UBICACION](key_ubicacion),
    CONSTRAINT FK_HABITOS_TIPO_SEGUIMIENTO FOREIGN KEY (key_tipo_seguimiento)
        REFERENCES [dbo].[DIM_TIPO_SEGUIMIENTO](key_tipo_seguimiento),
    CONSTRAINT FK_HABITOS_META FOREIGN KEY (key_meta)
        REFERENCES [dbo].[DIM_META](key_meta),

    CONSTRAINT PK_FACT_HABITOS PRIMARY KEY (key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento, key_meta),
    CONSTRAINT UQ_FACT_HABITOS_GRANO UNIQUE (key_persona, key_tiempo, key_tipo_seguimiento),
    CONSTRAINT CK_FACT_HABITOS_MEDIDAS CHECK (
        (minutos_realizados IS NULL OR minutos_realizados >= 0) AND
        (meta_minutos_semanal IS NULL OR meta_minutos_semanal > 0) AND
        (dias_con_contacto IS NULL OR dias_con_contacto BETWEEN 0 AND 7) AND
        (meta_dias_semanal IS NULL OR meta_dias_semanal BETWEEN 1 AND 7) AND
        NOT ((minutos_realizados IS NOT NULL OR meta_minutos_semanal IS NOT NULL)
             AND (dias_con_contacto IS NOT NULL OR meta_dias_semanal IS NOT NULL))
    ),
    CONSTRAINT CK_FACT_HABITOS_ESTADO CHECK (estado_datos IN ('CONFIRMADO','EN_CURSO','PENDIENTE','SIN_META'))
);
GO

-- HECHO 2. La PK está formada por las seis FK.
-- Grano: una persona, primer día del mes, un factor cardiometabólico.
IF OBJECT_ID(N'[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]', N'U') IS NULL
CREATE TABLE [dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES] (
    key_persona          INT NOT NULL,
    key_tiempo           INT NOT NULL,
    key_ubicacion        INT NOT NULL,
    key_tipo_seguimiento INT NOT NULL,
    key_origen_resultado  INT NOT NULL,
    key_meta             INT NOT NULL,
    factores_dentro_meta INT NOT NULL, -- M5: 0/1
    factores_previstos   INT NOT NULL, -- M6: 0/1
    estado_datos         VARCHAR(25) NOT NULL,
    fecha_corte          DATE NOT NULL,

    CONSTRAINT FK_CONTROLES_PERSONA FOREIGN KEY (key_persona)
        REFERENCES [dbo].[DIM_PERSONA](key_persona),
    CONSTRAINT FK_CONTROLES_TIEMPO FOREIGN KEY (key_tiempo)
        REFERENCES [dbo].[DIM_TIEMPO](key_tiempo),
    CONSTRAINT FK_CONTROLES_UBICACION FOREIGN KEY (key_ubicacion)
        REFERENCES [dbo].[DIM_UBICACION](key_ubicacion),
    CONSTRAINT FK_CONTROLES_TIPO_SEGUIMIENTO FOREIGN KEY (key_tipo_seguimiento)
        REFERENCES [dbo].[DIM_TIPO_SEGUIMIENTO](key_tipo_seguimiento),
    CONSTRAINT FK_CONTROLES_ORIGEN_RESULTADO FOREIGN KEY (key_origen_resultado)
        REFERENCES [dbo].[DIM_ORIGEN_RESULTADO](key_origen_resultado),
    CONSTRAINT FK_CONTROLES_META FOREIGN KEY (key_meta)
        REFERENCES [dbo].[DIM_META](key_meta),

    CONSTRAINT PK_FACT_CONTROLES PRIMARY KEY (key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento, key_origen_resultado, key_meta),
    CONSTRAINT UQ_FACT_CONTROLES_GRANO UNIQUE (key_persona, key_tiempo, key_tipo_seguimiento),
    CONSTRAINT CK_FACT_CONTROLES_MEDIDAS CHECK (factores_dentro_meta BETWEEN 0 AND 1 AND factores_previstos BETWEEN 0 AND 1 AND factores_dentro_meta <= factores_previstos),
    CONSTRAINT CK_FACT_CONTROLES_ESTADO CHECK (estado_datos IN ('DENTRO_META','FUERA_META','PENDIENTE','META_INCOMPLETA','NO_PROGRAMADO','SIN_META','NO_VIGENTE'))
);
GO

-- Índices: aceleran consultas por periodo, tipo de seguimiento y ubicación.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[FACT_HABITOS_SEMANALES]') AND name = N'IX_HABITOS_PERIODO')
    CREATE INDEX IX_HABITOS_PERIODO ON [dbo].[FACT_HABITOS_SEMANALES](key_tiempo, key_tipo_seguimiento, key_ubicacion)
    INCLUDE (minutos_realizados, meta_minutos_semanal, dias_con_contacto, meta_dias_semanal, estado_datos, fecha_corte);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]') AND name = N'IX_CONTROLES_PERIODO')
    CREATE INDEX IX_CONTROLES_PERIODO ON [dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES](key_tiempo, key_tipo_seguimiento, key_ubicacion)
    INCLUDE (factores_dentro_meta, factores_previstos, estado_datos, fecha_corte);
GO
