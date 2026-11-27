-- G1 | PASO 07. REPORTES DEL DATA MART (R01 a R06).
-- Ejecutar después de los scripts 01-06. Crea sólo objetos de consulta en el Mart.
-- Cada procedimiento constituye un reporte independiente. No modifica datos.
USE [prevencion_cognitiva_mart];
GO

-- Filtros comunes: función que devuelve una tabla de indicadores filtrados.
-- Las fechas corresponden al inicio de cada periodo.
-- NULL omite el filtro. El backend debe aplicar la autorización del titular o administrador.
CREATE OR ALTER FUNCTION [bi].[fn_IndicadoresReporte] (
    @desde DATE,
    @hasta DATE,
    @key_persona INT,
    @pais NVARCHAR(60),
    @departamento NVARCHAR(80),
    @provincia NVARCHAR(80),
    @distrito NVARCHAR(80),
    @sexo CHAR(1),
    @grupo_edad NVARCHAR(20),
    @solo_rango_edad BIT
)
RETURNS TABLE
AS RETURN (
    SELECT i.key_persona, i.sexo, i.estado_persona,
           i.key_ubicacion, i.pais, i.departamento, i.provincia, i.ciudad, i.distrito,
           i.edad, i.grupo_edad, i.en_rango_edad, i.periodo, i.fin_periodo,
           i.periodicidad, i.codigo_indicador, i.unidad_medida,
           i.numerador, i.denominador, i.porcentaje, i.estado_datos, i.estado_indicador,
           i.es_evaluable, i.periodo_cerrado, i.fecha_corte
    FROM [bi].[v_Indicadores] AS i
    WHERE (@desde IS NULL OR i.periodo >= @desde) AND (@hasta IS NULL OR i.periodo <= @hasta)
      AND (@key_persona IS NULL OR i.key_persona = @key_persona)
      AND (@pais IS NULL OR i.pais = @pais)
      AND (@departamento IS NULL OR i.departamento = @departamento)
      AND (@provincia IS NULL OR i.provincia = @provincia)
      AND (@distrito IS NULL OR i.distrito = @distrito)
      AND (@sexo IS NULL OR i.sexo = @sexo)
      AND (@grupo_edad IS NULL OR i.grupo_edad = @grupo_edad)
      AND (ISNULL(@solo_rango_edad, 1) = 0 OR i.en_rango_edad = 1)
);
GO

-- R01. REPORTE DE SEGUIMIENTO PREVENTIVO (reporte principal del informe).
-- 5 conjuntos de resultados: resumen, tabla de participantes, gráfico de avance,
-- distribución de estados y detalle de controles. No mezcla el grano de los hechos.
CREATE OR ALTER PROCEDURE [bi].[usp_ReporteSeguimientoPreventivo]
    @inicio_semana DATE = NULL,
    @mes_periodo DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET DATEFIRST 1; -- Lunes = 1.

    DECLARE @corte DATE;
    -- Fecha de corte tomada de los propios hechos, no de una tabla auxiliar.
    SELECT @corte = MAX(fecha_corte)
    FROM (
        SELECT MAX(fecha_corte) AS fecha_corte FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
        UNION ALL
        SELECT MAX(fecha_corte) FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
    ) AS cortes;

    IF @corte IS NULL
        SELECT @corte = MAX(id_tiempo)
        FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO];

    IF @corte IS NULL
        THROW 50101, N'Primero ejecute el ETL del Data Mart.', 1;

    -- Si no se indican periodos, usar los de la dimensión Tiempo.
    IF @inicio_semana IS NULL
        SELECT @inicio_semana = DATETRUNC(ISO_WEEK, id_tiempo)
        FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO]
        WHERE id_tiempo = @corte;

    IF @mes_periodo IS NULL
        SELECT @mes_periodo = DATETRUNC(MONTH, id_tiempo)
        FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO]
        WHERE id_tiempo = @corte;

    IF @inicio_semana IS NULL OR @mes_periodo IS NULL
        THROW 50106, N'El calendario dimensional no contiene la fecha del último ETL.', 1;

    IF DATEPART(WEEKDAY, @inicio_semana) <> 1
        THROW 50102, N'El inicio de semana debe ser lunes.', 1;

    IF DAY(@mes_periodo) <> 1
        THROW 50103, N'El periodo mensual debe ser el primer día del mes.', 1;

    IF @inicio_semana > @corte OR @mes_periodo > @corte
        THROW 50104, N'El periodo solicitado es posterior al último ETL.', 1;

    SELECT i.* INTO #seleccion
    FROM [bi].[fn_IndicadoresReporte](NULL, NULL, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i
    WHERE (i.codigo_indicador IN ('CAF','CCS') AND i.periodo = @inicio_semana)
       OR (i.codigo_indicador = 'FCM' AND i.periodo = @mes_periodo);

    -- R01-A. Resultados generales. Una tasa poblacional divide sumas, no porcentajes.
    ;WITH resumen AS (
        SELECT codigo_indicador, COUNT(*) AS participantes,
          SUM(CONVERT(BIGINT, CASE WHEN es_evaluable = 1 THEN 1 ELSE 0 END)) AS participantes_evaluables,
          SUM(CONVERT(BIGINT, CASE WHEN estado_datos = 'PENDIENTE' THEN 1 ELSE 0 END)) AS participantes_pendientes,
          SUM(CONVERT(BIGINT, CASE WHEN estado_datos IN ('SIN_META','NO_PROGRAMADO') THEN 1 ELSE 0 END)) AS participantes_sin_meta,
          SUM(numerador) AS numerador_observado, SUM(denominador) AS denominador_programado,
          SUM(CASE WHEN es_evaluable = 1 THEN numerador END) AS numerador_evaluable,
          SUM(CASE WHEN es_evaluable = 1 THEN denominador END) AS denominador_evaluable
        FROM #seleccion
        GROUP BY codigo_indicador
    ), Calculo AS (
        SELECT r.*,
               100.0 * CONVERT(DECIMAL(20, 2), r.numerador_evaluable)
                     / NULLIF(r.denominador_evaluable, 0) AS porcentaje_calculado
        FROM resumen AS r
    )
    SELECT N'R01-A | Resultados generales' AS reporte, k.codigo_indicador, k.nombre_indicador, k.periodo, k.unidad,
           ISNULL(r.participantes, 0) AS participantes, ISNULL(r.participantes_evaluables, 0) AS participantes_evaluables,
           ISNULL(r.participantes_pendientes, 0) AS participantes_pendientes, ISNULL(r.participantes_sin_meta, 0) AS participantes_sin_meta,
           r.numerador_observado, r.denominador_programado, r.numerador_evaluable, r.denominador_evaluable,
           CONVERT(DECIMAL(19, 2), r.porcentaje_calculado) AS porcentaje_general,
           CONVERT(DECIMAL(5, 2), 100) AS meta_porcentaje,
           CASE
               WHEN r.porcentaje_calculado IS NULL THEN 'SIN_DATOS_EVALUABLES'
               WHEN k.codigo_indicador = 'CAF' THEN
                   CASE
                       WHEN r.porcentaje_calculado >= 100 THEN 'OPTIMO'
                       WHEN r.porcentaje_calculado >= 70 THEN 'BUENO'
                       WHEN r.porcentaje_calculado >= 50 THEN 'REGULAR'
                       ELSE 'MALO'
                   END
               WHEN r.porcentaje_calculado >= 100 THEN 'BUENO'
               WHEN r.porcentaje_calculado > 0 THEN 'REGULAR'
               ELSE 'MALO'
           END AS estado_general,
           CONVERT(BIT, CASE WHEN (CASE WHEN k.codigo_indicador = 'FCM' THEN EOMONTH(k.periodo) ELSE DATEADD(DAY, 6, k.periodo) END)<@corte THEN 1 ELSE 0 END) AS periodo_cerrado,
           @corte AS fecha_corte
    FROM (VALUES
       ('CAF',N'Cumplimiento de actividad física', @inicio_semana,N'Minutos'),
       ('CCS',N'Cumplimiento de contacto social', @inicio_semana,N'Días'),
       ('FCM',N'Factores cardiometabólicos dentro de meta', @mes_periodo,N'Factores')
    ) k(codigo_indicador, nombre_indicador, periodo, unidad)
    LEFT JOIN Calculo AS r ON r.codigo_indicador = k.codigo_indicador
    ORDER BY CASE k.codigo_indicador WHEN 'CAF' THEN 1 WHEN 'CCS' THEN 2 ELSE 3 END;

    -- R01-B. Tabla por participante. Cada KPI se selecciona del periodo propio.
    -- MAX(CASE ...) selecciona el único valor de cada indicador para ese participante.
    -- Si un participante no tiene una fila para ese periodo, permanece NULL (no cero).
    SELECT N'R01-B | Seguimiento por participante' AS reporte, s.key_persona,
           MAX(s.sexo) AS sexo, MAX(s.departamento) AS departamento, MAX(s.provincia) AS provincia, MAX(s.distrito) AS distrito,
           MAX(CASE WHEN s.codigo_indicador IN ('CAF','CCS') THEN s.grupo_edad END) AS grupo_edad_semanal,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.grupo_edad END) AS grupo_edad_mensual,
           @inicio_semana AS inicio_semana, @mes_periodo AS mes_periodo,
           MAX(CASE WHEN s.codigo_indicador = 'CAF' THEN s.numerador END) AS M1_minutos_realizados,
           MAX(CASE WHEN s.codigo_indicador = 'CAF' THEN s.denominador END) AS M2_meta_minutos,
           MAX(CASE WHEN s.codigo_indicador = 'CAF' THEN s.porcentaje END) AS CAF_porcentaje,
           MAX(CASE WHEN s.codigo_indicador = 'CAF' THEN s.estado_indicador END) AS CAF_estado,
           MAX(CASE WHEN s.codigo_indicador = 'CAF' THEN s.estado_datos END) AS CAF_estado_datos,
           MAX(CASE WHEN s.codigo_indicador = 'CCS' THEN s.numerador END) AS M3_dias_contacto,
           MAX(CASE WHEN s.codigo_indicador = 'CCS' THEN s.denominador END) AS M4_meta_dias,
           MAX(CASE WHEN s.codigo_indicador = 'CCS' THEN s.porcentaje END) AS CCS_porcentaje,
           MAX(CASE WHEN s.codigo_indicador = 'CCS' THEN s.estado_indicador END) AS CCS_estado,
           MAX(CASE WHEN s.codigo_indicador = 'CCS' THEN s.estado_datos END) AS CCS_estado_datos,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.numerador END) AS M5_factores_dentro_meta,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.denominador END) AS M6_factores_previstos,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.porcentaje END) AS FCM_porcentaje,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.estado_indicador END) AS FCM_estado,
           MAX(CASE WHEN s.codigo_indicador = 'FCM' THEN s.estado_datos END) AS FCM_estado_datos,
           @corte AS fecha_corte
    FROM #seleccion s GROUP BY s.key_persona ORDER BY s.key_persona;

    -- R01-C. Datos para gráficos de barras: realizado frente a meta (por unidad y KPI).
    SELECT N'R01-C | Avance frente a la meta' AS reporte, codigo_indicador, key_persona, distrito, grupo_edad, periodo, unidad_medida,
           numerador AS realizado, denominador AS meta, porcentaje, CONVERT(DECIMAL(5, 2), 100) AS meta_porcentaje,
           estado_indicador, estado_datos, es_evaluable, periodo_cerrado
    FROM #seleccion ORDER BY codigo_indicador, key_persona;

    -- R01-D. Distribución de estados para gráficos comparativos de cumplimiento.
    SELECT N'R01-D | Distribución de estados' AS reporte, codigo_indicador, periodo, estado_indicador, estado_datos,
           COUNT(*) AS participantes
    FROM #seleccion GROUP BY codigo_indicador, periodo, estado_indicador, estado_datos
    ORDER BY codigo_indicador, estado_indicador, estado_datos;

    -- R01-E. Cuatro factores por participante/mes, incluyendo los no programados.
    SELECT N'R01-E | Detalle de controles programados' AS reporte, d.key_persona, d.periodo, d.tipo_control, d.criterio_meta,
           d.unidad, d.fin_periodo AS fin_mes, d.origen_resultado, d.estado_validacion, d.resultado_referencia,
           d.factores_dentro_meta AS M5, d.factores_previstos AS M6, d.estado_datos
    FROM [bi].[v_ControlesDetalle] d JOIN #seleccion s ON s.key_persona = d.key_persona AND s.periodo = d.periodo AND s.codigo_indicador = 'FCM'
    ORDER BY d.key_persona, d.tipo_control;
END;
GO

-- R02. REPORTE SEMANAL DE ACTIVIDAD FÍSICA (M1 y M2).
CREATE OR ALTER PROCEDURE [bi].[usp_ReporteActividadFisicaSemanal]
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @desde > @hasta THROW 50105,N'El intervalo de fechas no es válido.', 1;
    SELECT N'R02 | Actividad física semanal' AS reporte, i.key_persona, i.sexo, i.grupo_edad, i.distrito,
           i.periodo AS inicio_semana, i.fin_periodo AS fin_semana, i.numerador AS M1_minutos_realizados,
           i.denominador AS M2_meta_minutos_semanal, i.porcentaje AS CAF,
           i.estado_indicador, i.estado_datos, i.es_evaluable, i.periodo_cerrado, i.fecha_corte
    FROM [bi].[fn_IndicadoresReporte](@desde, @hasta, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i
    WHERE i.codigo_indicador = 'CAF' ORDER BY i.periodo DESC, i.key_persona;
END;
GO

-- R03. REPORTE SEMANAL DE CONTACTO SOCIAL (M3 y M4).
CREATE OR ALTER PROCEDURE [bi].[usp_ReporteContactoSocialSemanal]
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @desde > @hasta THROW 50105,N'El intervalo de fechas no es válido.', 1;
    SELECT N'R03 | Contacto social semanal' AS reporte, i.key_persona, i.sexo, i.grupo_edad, i.distrito,
           i.periodo AS inicio_semana, i.fin_periodo AS fin_semana, i.numerador AS M3_dias_con_contacto,
           i.denominador AS M4_meta_dias_semanal, i.porcentaje AS CCS,
           i.estado_indicador, i.estado_datos, i.es_evaluable, i.periodo_cerrado, i.fecha_corte
    FROM [bi].[fn_IndicadoresReporte](@desde, @hasta, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i
    WHERE i.codigo_indicador = 'CCS' ORDER BY i.periodo DESC, i.key_persona;
END;
GO

-- R04. REPORTE MENSUAL DE CONTROLES CARDIOMETABÓLICOS (M5 y M6).
-- Dos conjuntos: FCM por participante y detalle de cada uno de los 4 factores.
CREATE OR ALTER PROCEDURE [bi].[usp_ReporteControlesCardiometabolicosMensuales]
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @desde > @hasta THROW 50105,N'El intervalo de fechas no es válido.', 1;
    SELECT i.key_persona, i.periodo INTO #periodos
    FROM [bi].[fn_IndicadoresReporte](@desde, @hasta, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i
    WHERE i.codigo_indicador = 'FCM';
    SELECT N'R04-A | Control cardiometabólico mensual' AS reporte, f.key_persona, f.sexo, f.grupo_edad, f.distrito,
           f.periodo AS mes_periodo, f.numerador AS M5_factores_dentro_meta, f.denominador AS M6_factores_previstos,
           f.factores_evaluados, f.factores_pendientes, f.factores_no_programados, f.factores_sin_seguimiento,
           f.porcentaje AS FCM, f.estado_indicador, f.estado_datos, f.es_evaluable, f.periodo_cerrado, f.fecha_corte
    FROM [bi].[v_IndicadorFCM] f JOIN #periodos p ON p.key_persona = f.key_persona AND p.periodo = f.periodo
    ORDER BY f.periodo DESC, f.key_persona;

    SELECT N'R04-B | Detalle de factores cardiometabólicos' AS reporte, d.key_persona, d.periodo,
           d.tipo_control, d.criterio_meta, d.unidad, d.fin_periodo AS fin_mes, d.origen_resultado, d.estado_validacion, d.resultado_referencia,
           d.factores_dentro_meta AS M5, d.factores_previstos AS M6, d.estado_datos, d.fecha_corte
    FROM [bi].[v_ControlesDetalle] d JOIN #periodos p ON p.key_persona = d.key_persona AND p.periodo = d.periodo
    ORDER BY d.periodo DESC, d.key_persona, d.tipo_control;
END;
GO

-- R05. REPORTE DE PENDIENTES, SIN META Y NO PROGRAMADOS.
-- No confunde los datos no aportados con incumplimientos confirmados.
CREATE OR ALTER PROCEDURE [bi].[usp_ReportePendientesSeguimiento]
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @desde > @hasta THROW 50105,N'El intervalo de fechas no es válido.', 1;
    SELECT i.* INTO #indicadores
    FROM [bi].[fn_IndicadoresReporte](@desde, @hasta, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i;
    SELECT N'R05-A | Hábitos pendientes o sin meta' AS reporte, key_persona, distrito, grupo_edad, codigo_indicador,
           periodo, fin_periodo, numerador, denominador, estado_datos, estado_indicador, periodo_cerrado, fecha_corte
    FROM #indicadores WHERE codigo_indicador IN ('CAF','CCS') AND estado_datos IN ('PENDIENTE','SIN_META')
    ORDER BY periodo DESC, key_persona, codigo_indicador;

    SELECT N'R05-B | Controles pendientes o sin programación' AS reporte, d.key_persona, d.distrito, d.grupo_edad, d.periodo,
           d.tipo_control, d.fin_periodo AS fin_mes, d.estado_datos, d.origen_resultado, d.estado_validacion,
           d.factores_dentro_meta AS M5, d.factores_previstos AS M6, d.fecha_corte,
           CASE WHEN d.estado_datos IN ('PENDIENTE','META_INCOMPLETA') AND d.fin_periodo < d.fecha_corte THEN 'PERIODO_CERRADO'
                WHEN d.estado_datos IN ('PENDIENTE','META_INCOMPLETA') THEN 'PERIODO_EN_CURSO'
                ELSE 'NO_APLICA' END AS estado_periodo
    FROM [bi].[v_ControlesDetalle] d JOIN #indicadores i ON i.key_persona = d.key_persona AND i.periodo = d.periodo AND i.codigo_indicador = 'FCM'
    WHERE d.estado_datos IN ('PENDIENTE','META_INCOMPLETA','NO_PROGRAMADO','SIN_META','NO_VIGENTE')
    ORDER BY d.periodo DESC, d.key_persona, d.tipo_control;
END;
GO

-- R06. REPORTE DE EVOLUCIÓN Y COMPARACIÓN DE SEGMENTOS.
-- Serie temporal por indicador y tabla por distrito/grupo de edad/sexo.
-- Ratios agregados sólo con registros evaluables; los pendientes se cuentan aparte.
CREATE OR ALTER PROCEDURE [bi].[usp_ReporteEvolucionPreventiva]
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @key_persona INT = NULL,
    @pais NVARCHAR(60) = N'Perú',
    @departamento NVARCHAR(80) = NULL,
    @provincia NVARCHAR(80) = NULL,
    @distrito NVARCHAR(80) = NULL,
    @sexo CHAR(1) = NULL,
    @grupo_edad NVARCHAR(20) = NULL,
    @solo_rango_edad BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @desde > @hasta THROW 50105,N'El intervalo de fechas no es válido.', 1;
    SELECT i.* INTO #historia
    FROM [bi].[fn_IndicadoresReporte](@desde, @hasta, @key_persona, @pais, @departamento, @provincia, @distrito, @sexo, @grupo_edad, @solo_rango_edad) i;

    ;WITH serie AS (
       SELECT codigo_indicador, periodicidad, periodo, fin_periodo, unidad_medida, periodo_cerrado,
              COUNT(*) AS participantes,
              SUM(CONVERT(BIGINT, CASE WHEN es_evaluable = 1 THEN 1 ELSE 0 END)) AS participantes_evaluables,
              SUM(CONVERT(BIGINT, CASE WHEN estado_datos = 'PENDIENTE' THEN 1 ELSE 0 END)) AS participantes_pendientes,
              SUM(CASE WHEN es_evaluable = 1 THEN numerador END) AS numerador,
              SUM(CASE WHEN es_evaluable = 1 THEN denominador END) AS denominador
       FROM #historia GROUP BY codigo_indicador, periodicidad, periodo, fin_periodo, unidad_medida, periodo_cerrado
    )
    SELECT N'R06-A | Tendencia por periodo' AS reporte, s.*,
           CONVERT(DECIMAL(19, 2), 100.0*CONVERT(DECIMAL(20, 2), s.numerador)/NULLIF(s.denominador, 0)) AS porcentaje,
           CONVERT(DECIMAL(5, 2), 100) AS meta_porcentaje
    FROM serie s ORDER BY s.codigo_indicador, s.periodo;

    ;WITH segmento AS (
       SELECT codigo_indicador, periodicidad, periodo, departamento, provincia, distrito, grupo_edad, sexo, unidad_medida,
              COUNT(*) AS participantes,
              SUM(CONVERT(BIGINT, CASE WHEN es_evaluable = 1 THEN 1 ELSE 0 END)) AS participantes_evaluables,
              SUM(CONVERT(BIGINT, CASE WHEN estado_datos = 'PENDIENTE' THEN 1 ELSE 0 END)) AS participantes_pendientes,
              SUM(CASE WHEN es_evaluable = 1 THEN numerador END) AS numerador,
              SUM(CASE WHEN es_evaluable = 1 THEN denominador END) AS denominador
       FROM #historia GROUP BY codigo_indicador, periodicidad, periodo, departamento, provincia, distrito, grupo_edad, sexo, unidad_medida
    )
    SELECT N'R06-B | Comparación por segmento' AS reporte, s.*,
           CONVERT(DECIMAL(19, 2), 100.0*CONVERT(DECIMAL(20, 2), s.numerador)/NULLIF(s.denominador, 0)) AS porcentaje
    FROM segmento s ORDER BY s.codigo_indicador, s.periodo, s.distrito, s.grupo_edad, s.sexo;
END;
GO

-- ============================================================================
-- EJEMPLOS EN SSMS. Seleccionar y ejecutar sólo el EXEC del reporte requerido.
-- Cada procedimiento consulta el Data Mart, no el OLTP. No requiere ejecutar ETL otra vez
-- si la fecha de corte está vigente. Los filtros son opcionales.
-- ============================================================================
-- EXEC [bi].[usp_ReporteSeguimientoPreventivo] @departamento=N'La Libertad',@provincia=N'Trujillo';
-- EXEC [bi].[usp_ReporteActividadFisicaSemanal] @provincia=N'Trujillo';
-- EXEC [bi].[usp_ReporteContactoSocialSemanal] @provincia=N'Trujillo';
-- EXEC [bi].[usp_ReporteControlesCardiometabolicosMensuales] @provincia=N'Trujillo';
-- EXEC [bi].[usp_ReportePendientesSeguimiento] @provincia=N'Trujillo';
-- EXEC [bi].[usp_ReporteEvolucionPreventiva] @provincia=N'Trujillo';
-- Ejemplo por fechas y persona (reemplazar la KEY con una real/autorizada):
-- EXEC [bi].[usp_ReporteSeguimientoPreventivo] @inicio_semana='2026-11-23',@mes_periodo='2026-11-01',@key_persona=2;
