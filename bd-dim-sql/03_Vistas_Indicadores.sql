-- G1 | PASO 03. VISTAS PARA LOS INDICADORES
-- Se calculan CAF, CCS y FCM a partir de M1-M6 del Data Mart.
-- No se guardan porcentajes en los hechos ni se suman porcentajes de personas.
-- Las vistas utilizan key_persona como identificador analítico; no exponen nombres ni credenciales.

USE [prevencion_cognitiva_mart];
GO

-- 1. CAF y CCS: seleccionar los hechos semanales, calcular edad y porcentaje.
CREATE OR ALTER VIEW [bi].[v_IndicadoresSemanales]
AS
WITH Datos AS (
    SELECT p.key_persona, p.sexo, p.estado AS estado_persona,
           p.fecha_nacimiento,
           u.key_ubicacion, u.pais, u.departamento, u.provincia, u.ciudad, u.distrito,
           t.id_tiempo AS periodo,
           DATEADD(DAY, 6, t.id_tiempo) AS fin_periodo,
           t.anio, t.semana,
           CASE
               WHEN DATEADD(DAY, 6, t.id_tiempo) < f.fecha_corte
               THEN DATEADD(DAY, 6, t.id_tiempo)
               ELSE f.fecha_corte
           END AS fecha_edad,
           CASE WHEN s.id_tipo_seguimiento = N'ACTIVIDAD_FISICA'
                THEN 'CAF' ELSE 'CCS' END AS codigo_indicador,
           s.tipo_seguimiento, s.unidad_medida,
           m.id_meta, m.version_meta, m.origen_meta,
           f.minutos_realizados, f.meta_minutos_semanal,
           f.dias_con_contacto, f.meta_dias_semanal,
           -- ISNULL toma la segunda medida sólo si la primera no aplica a este hábito.
           ISNULL(f.minutos_realizados, CONVERT(BIGINT, f.dias_con_contacto)) AS numerador,
           CONVERT(BIGINT, ISNULL(f.meta_minutos_semanal, f.meta_dias_semanal)) AS denominador,
           f.estado_datos, f.fecha_corte
    FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES] AS f
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_PERSONA] AS p
        ON p.key_persona = f.key_persona
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.key_tiempo = f.key_tiempo
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_UBICACION] AS u
        ON u.key_ubicacion = f.key_ubicacion
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] AS s
        ON s.key_tipo_seguimiento = f.key_tipo_seguimiento
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_META] AS m
        ON m.key_meta = f.key_meta
), Calculos AS (
    SELECT d.*,
           -- Edad exacta: se resta un año si aún no llegó el cumpleaños.
           YEAR(d.fecha_edad) - YEAR(d.fecha_nacimiento)
           - CASE
                 WHEN DATEADD(YEAR, YEAR(d.fecha_edad) - YEAR(d.fecha_nacimiento),
                              d.fecha_nacimiento) > d.fecha_edad THEN 1
                 ELSE 0
             END AS edad,
           -- NULLIF(denominador, 0) evita dividir entre cero.
           CASE
               WHEN d.estado_datos IN ('CONFIRMADO', 'EN_CURSO')
               THEN 100.0 * CONVERT(DECIMAL(20,2), d.numerador) / NULLIF(d.denominador, 0)
           END AS porcentaje_calculado
    FROM Datos AS d
)
SELECT c.key_persona, c.sexo, c.estado_persona,
       c.key_ubicacion, c.pais, c.departamento, c.provincia, c.ciudad, c.distrito,
       c.periodo, c.fin_periodo, c.anio, c.semana, c.edad,
       CASE
           WHEN c.edad BETWEEN 30 AND 39 THEN N'30-39'
           WHEN c.edad BETWEEN 40 AND 49 THEN N'40-49'
           WHEN c.edad BETWEEN 50 AND 59 THEN N'50-59'
           WHEN c.edad BETWEEN 60 AND 65 THEN N'60-65'
           ELSE N'FUERA_RANGO'
       END AS grupo_edad,
       CONVERT(BIT, CASE WHEN c.edad BETWEEN 30 AND 65 THEN 1 ELSE 0 END) AS en_rango_edad,
       c.codigo_indicador, c.tipo_seguimiento, c.unidad_medida,
       c.id_meta, c.version_meta, c.origen_meta,
       c.minutos_realizados, c.meta_minutos_semanal, c.dias_con_contacto, c.meta_dias_semanal,
       c.numerador, c.denominador,
       CONVERT(DECIMAL(19,2), c.porcentaje_calculado) AS porcentaje,
       c.estado_datos,
       CASE
           WHEN c.denominador IS NULL THEN 'SIN_META'
           WHEN c.porcentaje_calculado IS NULL THEN 'DATOS_PENDIENTES'
           WHEN c.codigo_indicador = 'CAF' THEN
               CASE
                   WHEN c.porcentaje_calculado >= 100 THEN 'OPTIMO'
                   WHEN c.porcentaje_calculado >= 70 THEN 'BUENO'
                   WHEN c.porcentaje_calculado >= 50 THEN 'REGULAR'
                   ELSE 'MALO'
               END
           WHEN c.porcentaje_calculado >= 100 THEN 'BUENO'
           WHEN c.porcentaje_calculado > 0 THEN 'REGULAR'
           ELSE 'MALO'
       END AS estado_indicador,
       CONVERT(BIT, CASE WHEN c.porcentaje_calculado IS NOT NULL THEN 1 ELSE 0 END) AS es_evaluable,
       CONVERT(BIT, CASE WHEN c.fin_periodo < c.fecha_corte THEN 1 ELSE 0 END) AS periodo_cerrado,
       c.fecha_corte
FROM Calculos AS c;
GO

-- 2. Detalle mensual: una fila por factor cardiometabólico.
CREATE OR ALTER VIEW [bi].[v_ControlesDetalle]
AS
WITH Datos AS (
    SELECT p.key_persona, p.sexo, p.estado AS estado_persona,
           p.fecha_nacimiento,
           u.key_ubicacion, u.pais, u.departamento, u.provincia, u.ciudad, u.distrito,
           t.id_tiempo AS periodo, EOMONTH(t.id_tiempo) AS fin_periodo,
           t.anio, t.trimestre, t.mes,
           CASE
               WHEN EOMONTH(t.id_tiempo) < f.fecha_corte THEN EOMONTH(t.id_tiempo)
               ELSE f.fecha_corte
           END AS fecha_edad,
           s.id_tipo_seguimiento, s.tipo_control,
           o.origen_resultado, o.estado_validacion, o.resultado_referencia,
           m.id_meta, m.criterio_meta, m.unidad,
           f.factores_dentro_meta, f.factores_previstos, f.estado_datos, f.fecha_corte
    FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES] AS f
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_PERSONA] AS p
        ON p.key_persona = f.key_persona
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.key_tiempo = f.key_tiempo
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_UBICACION] AS u
        ON u.key_ubicacion = f.key_ubicacion
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] AS s
        ON s.key_tipo_seguimiento = f.key_tipo_seguimiento
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_ORIGEN_RESULTADO] AS o
        ON o.key_origen_resultado = f.key_origen_resultado
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_META] AS m
        ON m.key_meta = f.key_meta
), CalculoEdad AS (
    SELECT d.*,
           YEAR(d.fecha_edad) - YEAR(d.fecha_nacimiento)
           - CASE
                 WHEN DATEADD(YEAR, YEAR(d.fecha_edad) - YEAR(d.fecha_nacimiento),
                              d.fecha_nacimiento) > d.fecha_edad THEN 1
                 ELSE 0
             END AS edad
    FROM Datos AS d
)
SELECT c.key_persona, c.sexo, c.estado_persona,
       c.key_ubicacion, c.pais, c.departamento, c.provincia, c.ciudad, c.distrito,
       c.periodo, c.fin_periodo, c.anio, c.trimestre, c.mes, c.edad,
       CASE
           WHEN c.edad BETWEEN 30 AND 39 THEN N'30-39'
           WHEN c.edad BETWEEN 40 AND 49 THEN N'40-49'
           WHEN c.edad BETWEEN 50 AND 59 THEN N'50-59'
           WHEN c.edad BETWEEN 60 AND 65 THEN N'60-65'
           ELSE N'FUERA_RANGO'
       END AS grupo_edad,
       CONVERT(BIT, CASE WHEN c.edad BETWEEN 30 AND 65 THEN 1 ELSE 0 END) AS en_rango_edad,
       c.id_tipo_seguimiento, c.tipo_control, c.origen_resultado,
       c.estado_validacion, c.resultado_referencia,
       c.id_meta, c.criterio_meta, c.unidad,
       c.factores_dentro_meta, c.factores_previstos, c.estado_datos, c.fecha_corte
FROM CalculoEdad AS c;
GO

-- 3. FCM: agrupar los cuatro factores por persona y mes antes de calcular el porcentaje.
CREATE OR ALTER VIEW [bi].[v_IndicadorFCM]
AS
WITH Mensual AS (
    SELECT key_persona, sexo, estado_persona,
           key_ubicacion, pais, departamento, provincia, ciudad, distrito,
           periodo, fin_periodo, anio, trimestre, mes,
           edad, grupo_edad, en_rango_edad, fecha_corte,
           SUM(CONVERT(BIGINT, factores_dentro_meta)) AS numerador,
           SUM(CONVERT(BIGINT, factores_previstos)) AS denominador,
           SUM(CASE WHEN estado_datos IN ('DENTRO_META', 'FUERA_META') THEN 1 ELSE 0 END) AS factores_evaluados,
           SUM(CASE WHEN estado_datos IN ('PENDIENTE', 'META_INCOMPLETA') THEN 1 ELSE 0 END) AS factores_pendientes,
           SUM(CASE WHEN estado_datos IN ('SIN_META', 'NO_VIGENTE', 'NO_PROGRAMADO') THEN 1 ELSE 0 END) AS factores_sin_seguimiento,
           SUM(CASE WHEN estado_datos = 'NO_PROGRAMADO' THEN 1 ELSE 0 END) AS factores_no_programados
    FROM [bi].[v_ControlesDetalle]
    GROUP BY key_persona, sexo, estado_persona,
             key_ubicacion, pais, departamento, provincia, ciudad, distrito,
             periodo, fin_periodo, anio, trimestre, mes,
             edad, grupo_edad, en_rango_edad, fecha_corte
), Calculo AS (
    SELECT m.*,
           100.0 * CONVERT(DECIMAL(20,2), m.numerador) / NULLIF(m.denominador, 0) AS porcentaje_calculado
    FROM Mensual AS m
)
SELECT c.key_persona, c.sexo, c.estado_persona,
       c.key_ubicacion, c.pais, c.departamento, c.provincia, c.ciudad, c.distrito,
       c.periodo, c.fin_periodo, c.anio, c.trimestre, c.mes,
       c.edad, c.grupo_edad, c.en_rango_edad, c.fecha_corte,
       c.numerador, c.denominador, c.factores_evaluados, c.factores_pendientes,
       c.factores_sin_seguimiento, c.factores_no_programados,
       'FCM' AS codigo_indicador, N'FACTORES' AS unidad_medida,
       -- Sin resultados evaluables no se presenta un falso 0%. El avance parcial se distingue por su estado.
       CONVERT(DECIMAL(19,2), CASE WHEN c.factores_evaluados > 0 THEN c.porcentaje_calculado END) AS porcentaje,
       CASE
           WHEN c.denominador = 0 THEN
               CASE WHEN c.factores_no_programados = 4 THEN 'NO_PROGRAMADO' ELSE 'SIN_META' END
           WHEN c.factores_pendientes > 0 THEN 'PENDIENTE'
           ELSE 'CONFIRMADO'
       END AS estado_datos,
       CASE
           WHEN c.denominador = 0 THEN
               CASE WHEN c.factores_no_programados = 4 THEN 'NO_PROGRAMADO' ELSE 'SIN_META' END
           WHEN c.factores_pendientes > 0 OR c.factores_evaluados = 0 THEN 'DATOS_PENDIENTES'
           WHEN c.porcentaje_calculado = 100 THEN 'BUENO'
           WHEN c.porcentaje_calculado > 0 THEN 'REGULAR'
           ELSE 'MALO'
       END AS estado_indicador,
       CONVERT(BIT, CASE WHEN c.denominador > 0 AND c.factores_evaluados = c.denominador THEN 1 ELSE 0 END) AS es_evaluable,
       CONVERT(BIT, CASE WHEN c.fin_periodo < c.fecha_corte THEN 1 ELSE 0 END) AS periodo_cerrado
FROM Calculo AS c;
GO

-- 4. Vista común: UNION ALL reúne ambos granos sin multiplicar las medidas por JOIN.
CREATE OR ALTER VIEW [bi].[v_Indicadores]
AS
SELECT key_persona, sexo, estado_persona,
       key_ubicacion, pais, departamento, provincia, ciudad, distrito,
       edad, grupo_edad, en_rango_edad, periodo, fin_periodo,
       N'SEMANAL' AS periodicidad, codigo_indicador, unidad_medida,
       numerador, denominador, porcentaje, estado_datos, estado_indicador,
       es_evaluable, periodo_cerrado, fecha_corte
FROM [bi].[v_IndicadoresSemanales]
UNION ALL
SELECT key_persona, sexo, estado_persona,
       key_ubicacion, pais, departamento, provincia, ciudad, distrito,
       edad, grupo_edad, en_rango_edad, periodo, fin_periodo,
       N'MENSUAL' AS periodicidad, codigo_indicador, unidad_medida,
       numerador, denominador, porcentaje, estado_datos, estado_indicador,
       es_evaluable, periodo_cerrado, fecha_corte
FROM [bi].[v_IndicadorFCM];
GO

-- 5. Resumen poblacional: SUM(numerador) / SUM(denominador) * 100.
-- Sólo se incluyen registros evaluables en el porcentaje general.
CREATE OR ALTER VIEW [bi].[v_ResumenIndicadores]
AS
WITH Resumen AS (
    SELECT periodo, fin_periodo, periodicidad, codigo_indicador,
           unidad_medida, periodo_cerrado,
           COUNT(*) AS participantes_con_periodo,
           SUM(CONVERT(BIGINT, CASE WHEN es_evaluable = 1 THEN 1 ELSE 0 END)) AS participantes_evaluables,
           SUM(CONVERT(BIGINT, CASE WHEN estado_datos = 'PENDIENTE' THEN 1 ELSE 0 END)) AS participantes_pendientes,
           SUM(CASE WHEN es_evaluable = 1 THEN numerador END) AS numerador,
           SUM(CASE WHEN es_evaluable = 1 THEN denominador END) AS denominador
    FROM [bi].[v_Indicadores]
    WHERE en_rango_edad = 1 AND pais = N'Perú'
    GROUP BY periodo, fin_periodo, periodicidad, codigo_indicador,
             unidad_medida, periodo_cerrado
)
SELECT r.periodo, r.fin_periodo, r.periodicidad, r.codigo_indicador,
       r.unidad_medida, r.periodo_cerrado, r.participantes_con_periodo,
       r.participantes_evaluables, r.participantes_pendientes,
       r.numerador, r.denominador,
       CONVERT(DECIMAL(19,2), 100.0 * CONVERT(DECIMAL(20,2), r.numerador)
                              / NULLIF(r.denominador, 0)) AS porcentaje
FROM Resumen AS r;
GO

