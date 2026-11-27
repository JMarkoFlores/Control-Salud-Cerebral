-- G1 | PASO 04. ETL DE LOS DOS HECHOS
-- Ejecutar desde la BD transaccional, después de cargar las dimensiones.
-- Se usa el mismo método del ingeniero: DELETE + INSERT INTO ... SELECT FROM vista.
-- Los DELETE sólo afectan las tablas de hechos del Data Mart.

USE [prevencion_cognitiva];
GO

SET NOCOUNT ON;
SET DATEFIRST 1; -- Lunes = 1.
SET XACT_ABORT ON;

IF @@TRANCOUNT <> 0
    THROW 50003, N'Ejecute el ETL sin una transacción externa.', 1;

DECLARE @fecha_corte DATE;
DECLARE @hoy DATE = CONVERT(DATE, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SA Pacific Standard Time');

SELECT @fecha_corte = fecha_corte
FROM [dbo].[v_FechaCorteETL];

IF @fecha_corte IS NULL OR @fecha_corte <> @hoy
    THROW 50004, N'Primero ejecute el paso 03 para actualizar las dimensiones y el calendario.', 1;

-- Verificar que las fechas de origen respeten la granularidad acordada.
IF EXISTS (
    SELECT 1
    FROM [dbo].[meta_semanal]
    WHERE inicio_semana <= @fecha_corte
      AND DATEPART(WEEKDAY, inicio_semana) <> 1
)
    THROW 50005, N'Existe una meta semanal cuyo inicio no es lunes.', 1;

IF EXISTS (
    SELECT 1
    FROM [dbo].[control_programado]
    WHERE mes_periodo <= @fecha_corte
      AND DAY(mes_periodo) <> 1
)
    THROW 50006, N'Existe un control cuyo periodo no es el primer día del mes.', 1;

-- Comprobar que las personas, metas y orígenes ya tengan sus KEY dimensionales.
IF (SELECT COUNT(*) FROM [dbo].[v_PersonasETL]) <>
   (SELECT COUNT(*) FROM [dbo].[v_InicioSeguimiento] WHERE inicio_seguimiento <= @fecha_corte)
    THROW 50007, N'Faltan personas o ubicaciones. Vuelva a ejecutar el paso 03.', 1;

IF EXISTS (
    SELECT 1
    FROM [dbo].[v_DatosDimMeta] AS oltp
    LEFT JOIN [prevencion_cognitiva_mart].[dbo].[DIM_META] AS dim
        ON dim.id_meta COLLATE DATABASE_DEFAULT = oltp.id_meta
    WHERE dim.key_meta IS NULL
)
    THROW 50008, N'Faltan metas dimensionales. Vuelva a ejecutar el paso 03.', 1;

IF EXISTS (
    SELECT 1
    FROM [dbo].[v_DatosDimOrigenResultado] AS oltp
    LEFT JOIN [prevencion_cognitiva_mart].[dbo].[DIM_ORIGEN_RESULTADO] AS dim
        ON dim.id_origen_resultado COLLATE DATABASE_DEFAULT = oltp.id_origen_resultado
    WHERE dim.key_origen_resultado IS NULL
)
    THROW 50009, N'Faltan orígenes de resultado. Vuelva a ejecutar el paso 03.', 1;

-- Cantidades de filas esperadas: dos hábitos por semana y cuatro factores por mes.
DECLARE @habitos_esperados BIGINT;
DECLARE @controles_esperados BIGINT;

SELECT @habitos_esperados = COUNT_BIG(*) * 2
FROM (
    SELECT DISTINCT p.key_persona, t.inicio_semana
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.id_tiempo BETWEEN p.inicio_seguimiento AND p.fecha_corte
) AS semanas;

SELECT @controles_esperados = COUNT_BIG(*) * 4
FROM (
    SELECT DISTINCT p.key_persona, t.inicio_mes
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.id_tiempo BETWEEN p.inicio_seguimiento AND p.fecha_corte
) AS meses;

-- Una transacción protege ambos DELETE + INSERT. Si falla una carga,
-- se recuperan los hechos anteriores mediante ROLLBACK.
BEGIN TRY
    BEGIN TRANSACTION;

    ---------------------------------------------------------------------------
    -- HECHO 1: HÁBITOS SEMANALES
    ---------------------------------------------------------------------------
    DELETE FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES];

    INSERT INTO [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    (
        key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento, key_meta,
        minutos_realizados, meta_minutos_semanal,
        dias_con_contacto, meta_dias_semanal,
        estado_datos, fecha_corte
    )
    SELECT key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento, key_meta,
           minutos_realizados, meta_minutos_semanal,
           dias_con_contacto, meta_dias_semanal,
           estado_datos, fecha_corte
    FROM [dbo].[v_HechoHabitosSemanales];

    ---------------------------------------------------------------------------
    -- HECHO 2: CONTROLES CARDIOMETABÓLICOS MENSUALES
    ---------------------------------------------------------------------------
    DELETE FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES];

    INSERT INTO [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
    (
        key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento,
        key_origen_resultado, key_meta,
        factores_dentro_meta, factores_previstos,
        estado_datos, fecha_corte
    )
    SELECT key_persona, key_tiempo, key_ubicacion, key_tipo_seguimiento,
           key_origen_resultado, key_meta,
           factores_dentro_meta, factores_previstos,
           estado_datos, fecha_corte
    FROM [dbo].[v_HechoControlesCardiometabolicosMensuales];

    ---------------------------------------------------------------------------
    -- VALIDACIÓN ANTES DE CONFIRMAR
    ---------------------------------------------------------------------------
    IF (SELECT COUNT_BIG(*) FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]) <> @habitos_esperados
        THROW 50010, N'El número de filas de hábitos no coincide con lo esperado.', 1;

    IF (SELECT COUNT_BIG(*) FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]) <> @controles_esperados
        THROW 50011, N'El número de filas de controles no coincide con lo esperado.', 1;

    IF EXISTS (
        SELECT 1
        FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
        GROUP BY key_persona, key_tiempo
        HAVING COUNT(*) <> 2
    )
        THROW 50012, N'Una semana no contiene los dos hábitos.', 1;

    IF EXISTS (
        SELECT 1
        FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
        GROUP BY key_persona, key_tiempo
        HAVING COUNT(*) <> 4
    )
        THROW 50013, N'Un mes no contiene los cuatro factores.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Consultar el resultado de la carga, sin crear ninguna tabla de auditoría.
SELECT N'FACT_HABITOS_SEMANALES' AS tabla, COUNT_BIG(*) AS filas, @fecha_corte AS fecha_corte
FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
UNION ALL
SELECT N'FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES', COUNT_BIG(*), @fecha_corte
FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES];
GO

