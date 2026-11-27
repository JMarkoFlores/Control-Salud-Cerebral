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
FROM [prevencion_cognitiva_mart].[sys].[tables]
WHERE is_ms_shipped = 0 AND name <> N'sysdiagrams';

-- Comprobar los nombres y el orden exacto de las columnas de la Tabla 4.
-- KEY al inicio, niveles aprobados e ID al final. Cero discrepancias = correcto.
;WITH Esperadas AS (
    SELECT v.tabla, v.orden, v.columna
    FROM (VALUES
        (N'DIM_PERSONA',1,N'key_persona'), (N'DIM_PERSONA',2,N'estado'),
        (N'DIM_PERSONA',3,N'grupo_edad'), (N'DIM_PERSONA',4,N'fecha_nacimiento'),
        (N'DIM_PERSONA',5,N'fecha_alta'), (N'DIM_PERSONA',6,N'sexo'),
        (N'DIM_PERSONA',7,N'nombres'), (N'DIM_PERSONA',8,N'id_persona'),
        (N'DIM_TIEMPO',1,N'key_tiempo'), (N'DIM_TIEMPO',2,N'anio'),
        (N'DIM_TIEMPO',3,N'trimestre'), (N'DIM_TIEMPO',4,N'mes'),
        (N'DIM_TIEMPO',5,N'semana'), (N'DIM_TIEMPO',6,N'dia'),
        (N'DIM_TIEMPO',7,N'dia_semana'), (N'DIM_TIEMPO',8,N'id_tiempo'),
        (N'DIM_UBICACION',1,N'key_ubicacion'), (N'DIM_UBICACION',2,N'pais'),
        (N'DIM_UBICACION',3,N'departamento'), (N'DIM_UBICACION',4,N'provincia'),
        (N'DIM_UBICACION',5,N'ciudad'), (N'DIM_UBICACION',6,N'distrito'),
        (N'DIM_UBICACION',7,N'id_ubicacion'),
        (N'DIM_TIPO_SEGUIMIENTO',1,N'key_tipo_seguimiento'),
        (N'DIM_TIPO_SEGUIMIENTO',2,N'periodicidad'), (N'DIM_TIPO_SEGUIMIENTO',3,N'tipo_seguimiento'),
        (N'DIM_TIPO_SEGUIMIENTO',4,N'tipo_control'), (N'DIM_TIPO_SEGUIMIENTO',5,N'unidad_medida'),
        (N'DIM_TIPO_SEGUIMIENTO',6,N'id_tipo_seguimiento'),
        (N'DIM_ORIGEN_RESULTADO',1,N'key_origen_resultado'),
        (N'DIM_ORIGEN_RESULTADO',2,N'origen_resultado'), (N'DIM_ORIGEN_RESULTADO',3,N'estado_validacion'),
        (N'DIM_ORIGEN_RESULTADO',4,N'resultado_referencia'), (N'DIM_ORIGEN_RESULTADO',5,N'id_origen_resultado'),
        (N'DIM_META',1,N'key_meta'), (N'DIM_META',2,N'tipo_meta'),
        (N'DIM_META',3,N'criterio_meta'), (N'DIM_META',4,N'unidad'),
        (N'DIM_META',5,N'origen_meta'), (N'DIM_META',6,N'version_meta'),
        (N'DIM_META',7,N'vigencia'), (N'DIM_META',8,N'id_meta')
    ) AS v(tabla, orden, columna)
), Reales AS (
    SELECT t.name COLLATE DATABASE_DEFAULT AS tabla,
           ROW_NUMBER() OVER (PARTITION BY t.object_id ORDER BY c.column_id) AS orden,
           c.name COLLATE DATABASE_DEFAULT AS columna
    FROM [prevencion_cognitiva_mart].[sys].[tables] AS t
    INNER JOIN [prevencion_cognitiva_mart].[sys].[columns] AS c ON c.object_id = t.object_id
    INNER JOIN [prevencion_cognitiva_mart].[sys].[schemas] AS s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.name IN (N'DIM_PERSONA',N'DIM_TIEMPO',N'DIM_UBICACION',
          N'DIM_TIPO_SEGUIMIENTO',N'DIM_ORIGEN_RESULTADO',N'DIM_META')
)
SELECT ISNULL(e.tabla, r.tabla) AS tabla,
       ISNULL(e.orden, r.orden) AS posicion,
       e.columna AS columna_esperada,
       r.columna AS columna_real
FROM Esperadas AS e
FULL JOIN Reales AS r ON r.tabla = e.tabla AND r.orden = e.orden
WHERE e.columna IS NULL OR r.columna IS NULL OR e.columna <> r.columna
ORDER BY tabla, posicion;

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
