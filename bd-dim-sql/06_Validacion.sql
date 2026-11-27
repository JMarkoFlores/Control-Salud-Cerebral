-- G1 | PASO 06. VALIDACIÓN DE LA CARGA
-- Sólo consultas SELECT: no altera el OLTP ni el Data Mart.
USE [prevencion_cognitiva_oltp];
GO
SET NOCOUNT ON;

DECLARE @corte DATE;
SELECT @corte = MAX(fecha_corte)
FROM (
    SELECT MAX(fecha_corte) AS fecha_corte FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    UNION ALL
    SELECT MAX(fecha_corte) FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
) AS cortes;

-- Si no hay participantes, usar la última fecha del calendario.
IF @corte IS NULL
    SELECT @corte = MAX(id_tiempo)
    FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO];

IF @corte IS NULL
    THROW 50015, N'Primero ejecute el ETL (pasos 03 y 04).', 1;

-- Se usa el día siguiente para incluir todas las horas de la fecha de corte.
DECLARE @dia_siguiente DATE = DATEADD(DAY, 1, @corte);

-- 1. Fecha de corte y número de registros de las ocho tablas principales.
SELECT @corte AS fecha_corte;

SELECT COUNT(*) AS total_tablas_data_mart,
       CASE WHEN COUNT(*) = 8 THEN 'OK' ELSE 'REVISAR: deben existir 8 tablas' END AS validacion
FROM [prevencion_cognitiva_mart].[sys].[tables];

SELECT N'DIM_PERSONA' AS tabla, COUNT(*) AS filas FROM [prevencion_cognitiva_mart].[dbo].[DIM_PERSONA] UNION ALL
SELECT N'DIM_TIEMPO', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] UNION ALL
SELECT N'DIM_UBICACION', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[DIM_UBICACION] UNION ALL
SELECT N'DIM_TIPO_SEGUIMIENTO', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] UNION ALL
SELECT N'DIM_ORIGEN_RESULTADO', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[DIM_ORIGEN_RESULTADO] UNION ALL
SELECT N'DIM_META', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[DIM_META] UNION ALL
SELECT N'FACT_HABITOS_SEMANALES', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES] UNION ALL
SELECT N'FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES', COUNT(*) FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES];

-- 2. Conciliación de medidas aditivas (M1, M2, M3, M4, M6).
-- Ejecutar justo después del ETL y sin escrituras concurrentes del aplicativo.
-- M5 exige resultado de referencia válido y coherencia con criterios individuales;
-- se verifica por control y estado en las consultas posteriores.
;WITH ol AS (
    SELECT N'M1' AS medida, ISNULL(SUM(CONVERT(BIGINT, duracion_minutos)), 0) AS total
    FROM [dbo].[sesion_fisica]
    WHERE estado = 'VALIDO' AND fecha_hora < @dia_siguiente
    UNION ALL
    SELECT N'M2', ISNULL(SUM(CONVERT(BIGINT, valor_meta)), 0)
    FROM [dbo].[meta_semanal] WHERE vigente = 1 AND habito = 'ACTIVIDAD_FISICA' AND inicio_semana <= @corte
    UNION ALL
    SELECT N'M3', COUNT(*) FROM (
        SELECT DISTINCT persona_id, CONVERT(DATE, fecha_hora) AS fecha
        FROM [dbo].[contacto_social]
        WHERE estado = 'VALIDO' AND fecha_hora < @dia_siguiente
    ) AS dias
    UNION ALL
    SELECT N'M4', ISNULL(SUM(CONVERT(BIGINT, valor_meta)), 0)
    FROM [dbo].[meta_semanal] WHERE vigente = 1 AND habito = 'CONTACTO_SOCIAL' AND inicio_semana <= @corte
    UNION ALL
    SELECT N'M6', COUNT(*) FROM [dbo].[v_DatosControlProgramado] WHERE tiene_meta_prevista = 1 AND mes_periodo <= @corte
), mart AS (
    SELECT N'M1' AS medida, ISNULL(SUM(minutos_realizados), 0) AS total FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    UNION ALL SELECT N'M2', ISNULL(SUM(CONVERT(BIGINT, meta_minutos_semanal)), 0) FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    UNION ALL SELECT N'M3', ISNULL(SUM(CONVERT(BIGINT, dias_con_contacto)), 0) FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    UNION ALL SELECT N'M4', ISNULL(SUM(CONVERT(BIGINT, meta_dias_semanal)), 0) FROM [prevencion_cognitiva_mart].[dbo].[FACT_HABITOS_SEMANALES]
    UNION ALL SELECT N'M6', ISNULL(SUM(CONVERT(BIGINT, factores_previstos)), 0) FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
)
SELECT ol.medida, ol.total AS total_oltp, mart.total AS total_mart,
       CASE WHEN ol.total = mart.total THEN 'OK' ELSE 'REVISAR' END AS validacion
FROM ol JOIN mart ON ol.medida = mart.medida ORDER BY ol.medida;

-- 3. M5 por estado: dentro de meta se cuenta únicamente cuando estado_datos=DENTRO_META.
SELECT estado_datos, COUNT(*) AS filas, SUM(CONVERT(BIGINT, factores_dentro_meta)) AS M5,
       SUM(CONVERT(BIGINT, factores_previstos)) AS M6
FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES] GROUP BY estado_datos;

SELECT N'Inconsistencia de M5' AS prueba, COUNT(*) AS errores
FROM [prevencion_cognitiva_mart].[dbo].[FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES]
WHERE factores_dentro_meta <> CASE WHEN estado_datos = 'DENTRO_META' THEN 1 ELSE 0 END
UNION ALL
SELECT N'Porcentaje definitivo semanal con datos pendientes', COUNT(*)
FROM [prevencion_cognitiva_mart].[bi].[v_IndicadoresSemanales] WHERE estado_datos = 'PENDIENTE' AND porcentaje IS NOT NULL
UNION ALL
SELECT N'FCM evaluable sin todos sus controles evaluados', COUNT(*)
FROM [prevencion_cognitiva_mart].[bi].[v_IndicadorFCM] WHERE es_evaluable = 1 AND factores_evaluados <> denominador
UNION ALL
SELECT N'Indicador con denominador cero y porcentaje', COUNT(*)
FROM [prevencion_cognitiva_mart].[bi].[v_Indicadores] WHERE (denominador = 0 OR denominador IS NULL) AND porcentaje IS NOT NULL;

-- 4. Diagnóstico de datos de origen: no se reescribe ni se inventa información.
SELECT N'Resultado vinculado a otra persona, tipo, mes o unidad' AS diagnostico, r.resultado_id, c.control_id
FROM [dbo].[resultado_control] r
JOIN [dbo].[control_programado] c ON c.control_id = r.control_id
WHERE r.persona_id <> c.persona_id OR r.tipo_control <> c.tipo_control OR r.unidad <> c.unidad
   OR CONVERT(DATE, r.fecha_medicion)<c.mes_periodo OR CONVERT(DATE, r.fecha_medicion) >= DATEADD(MONTH, 1, c.mes_periodo);

SELECT N'Confirmación contradictoria con registro válido' AS diagnostico, c.persona_id, c.fecha, c.habito
FROM [dbo].[confirmacion_diaria] c
JOIN [dbo].[v_DatosHabitosDiarios] h ON h.persona_id = c.persona_id AND h.fecha = c.fecha AND c.habito = h.habito
WHERE c.estado_confirmacion = 'CONFIRMADO_SIN_ACTIVIDAD';

SELECT N'Meta clínica sin criterio numérico verificable' AS diagnostico, control_id, persona_id, tipo_control, mes_periodo
FROM [dbo].[v_DatosControlProgramado] WHERE tiene_meta_prevista = 1 AND meta_evaluable = 0;

-- 5. Vista previa de resultados analíticos. No incluye nombres ni credenciales.
SELECT TOP (100) * FROM [prevencion_cognitiva_mart].[bi].[v_Indicadores] ORDER BY periodo DESC, key_persona, codigo_indicador;
SELECT TOP (100) * FROM [prevencion_cognitiva_mart].[bi].[v_ControlesDetalle] ORDER BY periodo DESC, key_persona, id_tipo_seguimiento;
SELECT * FROM [prevencion_cognitiva_mart].[bi].[v_ResumenIndicadores] ORDER BY periodo DESC, codigo_indicador;
GO
