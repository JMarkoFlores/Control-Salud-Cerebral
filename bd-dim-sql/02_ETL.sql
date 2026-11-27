-- G1 | PASO 02. PREPARACIÓN DE DATOS DEL OLTP
-- Las vistas de ETL se crean dentro de la base transaccional, en dbo.
-- Sólo realizan SELECT; no insertan ni modifican registros del OLTP.

USE [prevencion_cognitiva_oltp];
GO

-- D1. Persona: estado descriptivo y PK de origen.
CREATE OR ALTER VIEW [dbo].[v_DatosDimPersona]
AS
SELECT p.persona_id AS id_persona,
       CONVERT(NVARCHAR(201), TRIM(CONCAT(p.nombres, N' ', p.apellidos))) AS nombres,
       p.fecha_nacimiento,
       p.sexo, p.fecha_alta,
       CASE WHEN p.activo = 1 THEN N'ACTIVO' ELSE N'INACTIVO' END AS estado,
       p.ubicacion_id AS id_ubicacion
FROM [dbo].[persona] AS p;
GO

-- D3. Ubicación: ciudad proviene del OLTP y se conserva como nivel propio.
CREATE OR ALTER VIEW [dbo].[v_DatosDimUbicacion]
AS
SELECT u.ubicacion_id AS id_ubicacion,
       u.pais, u.departamento, u.provincia, u.ciudad,
       u.distrito
FROM [dbo].[ubicacion] AS u;
GO

-- D4. Los tipos están definidos en las restricciones CHECK del OLTP.
CREATE OR ALTER VIEW [dbo].[v_DatosDimTipoSeguimiento]
AS
SELECT v.id_tipo_seguimiento, v.periodicidad, v.tipo_seguimiento,
       v.tipo_control, v.unidad_medida
FROM (VALUES
    (N'ACTIVIDAD_FISICA', N'SEMANAL', N'Actividad física', NULL, N'MINUTOS'),
    (N'CONTACTO_SOCIAL', N'SEMANAL', N'Contacto social', NULL, N'DIAS'),
    (N'PRESION_ARTERIAL', N'MENSUAL', N'Control cardiometabólico', N'Presión arterial', N'FACTORES'),
    (N'GLUCOSA', N'MENSUAL', N'Control cardiometabólico', N'Glucosa', N'FACTORES'),
    (N'COLESTEROL_LDL', N'MENSUAL', N'Control cardiometabólico', N'Colesterol LDL', N'FACTORES'),
    (N'IMC', N'MENSUAL', N'Control cardiometabólico', N'IMC', N'FACTORES')
) AS v(id_tipo_seguimiento, periodicidad, tipo_seguimiento, tipo_control, unidad_medida);
GO

-- D5. Preparar resultados y su código compuesto de origen.
-- Ejemplo: LABORATORIO|1|1 = laboratorio, validado y de referencia.
-- CONVERT cambia el tipo de dato; UPPER transforma texto a mayúsculas.
CREATE OR ALTER VIEW [dbo].[v_DatosResultados]
AS
SELECT r.resultado_id, r.control_id, r.persona_id, r.tipo_control,
       r.fecha_medicion, r.valor_numerico, r.valor_sistolica, r.valor_diastolica,
       r.unidad, r.origen, r.validado, r.es_referencia, r.dentro_de_meta,
       CONVERT(NVARCHAR(50),
           UPPER(r.origen) COLLATE DATABASE_DEFAULT + N'|'
           + CONVERT(NVARCHAR(1), r.validado) + N'|'
           + CONVERT(NVARCHAR(1), r.es_referencia)
       ) AS id_origen_resultado
FROM [dbo].[resultado_control] AS r;
GO

CREATE OR ALTER VIEW [dbo].[v_DatosDimOrigenResultado]
AS
SELECT DISTINCT r.id_origen_resultado,
       CONVERT(NVARCHAR(25), CASE UPPER(r.origen)
           WHEN 'AUTORREPORTE' THEN N'Autorreporte'
           WHEN 'DISPOSITIVO' THEN N'Dispositivo'
           WHEN 'LABORATORIO' THEN N'Laboratorio'
           ELSE N'Otro'
       END) COLLATE DATABASE_DEFAULT AS origen_resultado,
       CASE WHEN r.validado = 1 THEN N'VALIDADO' ELSE N'PENDIENTE' END AS estado_validacion,
       r.es_referencia AS resultado_referencia
FROM [dbo].[v_DatosResultados] AS r

UNION ALL

SELECT N'SIN_RESULTADO', N'Sin resultado', N'NO_APLICA', CONVERT(BIT, NULL);
GO

-- D6. Metas semanales y cardiometabólicas.
-- UNION ALL reúne los dos orígenes utilizando exactamente las mismas columnas.
-- El prefijo SEM o CTRL evita que coincidan IDs de tablas diferentes.
CREATE OR ALTER VIEW [dbo].[v_DatosDimMeta]
AS
SELECT CONVERT(NVARCHAR(40), N'SEM:' + CONVERT(NVARCHAR(12), m.meta_id)) AS id_meta,
       N'SEMANAL' AS tipo_meta,
       N'Alcanzar meta personal semanal' AS criterio_meta,
       CONVERT(NVARCHAR(20), m.unidad) COLLATE DATABASE_DEFAULT AS unidad,
       CONVERT(NVARCHAR(30), m.origen_meta) COLLATE DATABASE_DEFAULT AS origen_meta,
       m.version_meta, m.vigente AS vigencia
FROM [dbo].[meta_semanal] AS m

UNION ALL

SELECT CONVERT(NVARCHAR(40), N'CTRL:' + CONVERT(NVARCHAR(12), c.control_id)),
       N'CARDIOMETABOLICA',
       CONVERT(NVARCHAR(100), c.criterio_meta_texto) COLLATE DATABASE_DEFAULT,
       CONVERT(NVARCHAR(20), c.unidad) COLLATE DATABASE_DEFAULT,
       N'NO_REGISTRADO', NULL, c.vigente
FROM [dbo].[control_programado] AS c

UNION ALL

SELECT N'SIN_META', N'SIN_META', NULL, NULL, NULL, NULL, NULL;
GO

-- D2. Fechas de origen: determinar el inicio de seguimiento de cada persona.
-- MIN obtiene la fecha más antigua entre las tablas transaccionales.
CREATE OR ALTER VIEW [dbo].[v_InicioSeguimiento]
AS
SELECT persona_id AS id_persona, MIN(fecha) AS inicio_seguimiento
FROM (
    SELECT persona_id, CONVERT(DATE, fecha_alta) AS fecha
    FROM [dbo].[persona]

    UNION ALL SELECT persona_id, inicio_semana
    FROM [dbo].[meta_semanal]

    UNION ALL SELECT persona_id, CONVERT(DATE, fecha_hora)
    FROM [dbo].[sesion_fisica]

    UNION ALL SELECT persona_id, CONVERT(DATE, fecha_hora)
    FROM [dbo].[contacto_social]

    UNION ALL SELECT persona_id, fecha
    FROM [dbo].[confirmacion_diaria]

    UNION ALL SELECT persona_id, mes_periodo
    FROM [dbo].[control_programado]

    UNION ALL SELECT persona_id, CONVERT(DATE, fecha_medicion)
    FROM [dbo].[resultado_control]
) AS datos
GROUP BY persona_id;
GO

-- H1. Preparar las medidas diarias (sólo registros válidos).
-- M1: SUM de los minutos; M3: una fecha con contacto equivale a un día.
CREATE OR ALTER VIEW [dbo].[v_DatosHabitosDiarios]
AS
SELECT s.persona_id,
       CONVERT(DATE, s.fecha_hora) AS fecha,
       N'ACTIVIDAD_FISICA' AS habito,
       SUM(CONVERT(BIGINT, s.duracion_minutos)) AS cantidad
FROM [dbo].[sesion_fisica] AS s
WHERE s.estado = 'VALIDO'
GROUP BY s.persona_id, CONVERT(DATE, s.fecha_hora)

UNION ALL

SELECT c.persona_id,
       CONVERT(DATE, c.fecha_hora),
       N'CONTACTO_SOCIAL',
       CONVERT(BIGINT, 1)
FROM [dbo].[contacto_social] AS c
WHERE c.estado = 'VALIDO'
GROUP BY c.persona_id, CONVERT(DATE, c.fecha_hora);
GO

-- H2. Preparar los controles y verificar que tengan criterios registrados.
-- Los valores límite y la fecha prevista permanecen en el OLTP; no son niveles de DIM_META.
-- TRIM quita los espacios de los extremos de un texto.
-- Sólo se consideran los límites ingresados; no se asignan límites médicos nuevos.
CREATE OR ALTER VIEW [dbo].[v_DatosControlProgramado]
AS
SELECT c.control_id, c.persona_id, c.tipo_control, c.mes_periodo,
       c.fecha_prevista, c.criterio_meta_texto,
       c.valor_meta_min, c.valor_meta_max, c.valor_meta_max_diast,
       c.unidad, c.vigente,
       CONVERT(NVARCHAR(40), N'CTRL:' + CONVERT(NVARCHAR(12), c.control_id)) AS id_meta,
       CASE c.tipo_control
           WHEN 'Presión arterial' THEN N'PRESION_ARTERIAL'
           WHEN 'Glucosa' THEN N'GLUCOSA'
           WHEN 'Colesterol LDL' THEN N'COLESTEROL_LDL'
           WHEN 'IMC' THEN N'IMC'
       END AS id_tipo_seguimiento,
       CASE
           WHEN c.vigente = 1 AND TRIM(c.criterio_meta_texto) <> '' THEN 1
           ELSE 0
       END AS tiene_meta_prevista,
       CASE
           WHEN c.tipo_control = 'Presión arterial' THEN
               CASE WHEN c.valor_meta_max IS NOT NULL AND c.valor_meta_max_diast IS NOT NULL
                    THEN 1 ELSE 0 END
           WHEN (c.valor_meta_min IS NOT NULL OR c.valor_meta_max IS NOT NULL)
            AND (c.valor_meta_min IS NULL OR c.valor_meta_max IS NULL
                 OR c.valor_meta_min <= c.valor_meta_max)
           THEN 1
           ELSE 0
       END AS meta_evaluable
FROM [dbo].[control_programado] AS c;
GO


-- La fecha de corte se obtiene del calendario cargado en el paso 03.
-- No se necesita una tabla adicional para mantenerla.
CREATE OR ALTER VIEW [dbo].[v_FechaCorteETL]
AS
SELECT MAX(id_tiempo) AS fecha_corte
FROM [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO];
GO

-- Resolver la KEY de persona y ubicación a partir de los IDs del OLTP.
-- en_rango deja fuera de los hechos a quien está fuera de 30-65 al corte
-- y a las cuentas administrativas, que no son participantes del piloto.
CREATE OR ALTER VIEW [dbo].[v_PersonasETL]
AS
SELECT p.id_persona, p.key_persona, u.key_ubicacion,
       inicio.inicio_seguimiento, corte.fecha_corte,
       CONVERT(BIT, CASE
           WHEN p.grupo_edad <> N'FUERA_RANGO'
            AND NOT EXISTS (
                SELECT 1 FROM [dbo].[cuenta_rol] AS c
                WHERE c.persona_titular_id = p.id_persona AND c.rol = 'ADMIN'
            )
           THEN 1 ELSE 0 END) AS en_rango
FROM [dbo].[v_DatosDimPersona] AS origen
INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_PERSONA] AS p
    ON p.id_persona = origen.id_persona
INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_UBICACION] AS u
    ON u.id_ubicacion = origen.id_ubicacion
INNER JOIN [dbo].[v_InicioSeguimiento] AS inicio
    ON inicio.id_persona = origen.id_persona
CROSS JOIN [dbo].[v_FechaCorteETL] AS corte
WHERE inicio.inicio_seguimiento <= corte.fecha_corte;
GO

-- ============================================================================
-- VISTA DEL HECHO 1: HÁBITOS SEMANALES (M1, M2, M3, M4).
-- Sigue el patrón del ingeniero: vista en OLTP, JOIN con las dimensiones del Mart,
-- GROUP BY por las KEY y después carga mediante INSERT INTO ... SELECT.
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[v_HechoHabitosSemanales]
AS
WITH HabitosDiarios AS (
    -- DIM_TIEMPO contiene todos los días, incluidos aquellos sin registros.
    -- DATETRUNC(ISO_WEEK, fecha) obtiene el lunes sin guardar otro nivel en la dimensión.
    SELECT p.id_persona, p.key_persona, p.key_ubicacion,
           semana.key_tiempo, DATETRUNC(ISO_WEEK, dia.id_tiempo) AS inicio_semana,
           s.key_tipo_seguimiento,
           s.id_tipo_seguimiento COLLATE DATABASE_DEFAULT AS habito,
           p.fecha_corte,
           ISNULL(a.cantidad, 0) AS cantidad,
           CASE
               WHEN a.cantidad IS NOT NULL
                AND c.estado_confirmacion = 'CONFIRMADO_SIN_ACTIVIDAD' THEN 1
               WHEN a.cantidad IS NOT NULL THEN 0
               WHEN c.estado_confirmacion = 'CONFIRMADO_SIN_ACTIVIDAD' THEN 0
               ELSE 1
           END AS falta_confirmar
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS dia
        ON dia.id_tiempo BETWEEN p.inicio_seguimiento AND p.fecha_corte
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS semana
        ON semana.id_tiempo = DATETRUNC(ISO_WEEK, dia.id_tiempo)
    CROSS JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] AS s
    LEFT JOIN [dbo].[v_DatosHabitosDiarios] AS a
        ON a.persona_id = p.id_persona
       AND a.fecha = dia.id_tiempo
       AND a.habito = s.id_tipo_seguimiento COLLATE DATABASE_DEFAULT
    LEFT JOIN [dbo].[confirmacion_diaria] AS c
        ON c.persona_id = p.id_persona
       AND c.fecha = dia.id_tiempo
       AND c.habito = s.id_tipo_seguimiento COLLATE DATABASE_DEFAULT
    WHERE s.periodicidad = N'SEMANAL'
      AND p.en_rango = 1
), HabitosAgrupados AS (
    -- Primero sumar los registros diarios; después unir la meta una sola vez.
    SELECT id_persona, key_persona, key_ubicacion, key_tiempo, inicio_semana,
           key_tipo_seguimiento, habito, fecha_corte,
           SUM(cantidad) AS realizado,
           SUM(falta_confirmar) AS pendientes
    FROM HabitosDiarios
    GROUP BY id_persona, key_persona, key_ubicacion, key_tiempo, inicio_semana,
             key_tipo_seguimiento, habito, fecha_corte
)
SELECT h.key_persona, h.key_tiempo, h.key_ubicacion, h.key_tipo_seguimiento,
       dm.key_meta,
       -- M1 y M2: actividad física.
       CASE WHEN h.habito = N'ACTIVIDAD_FISICA'
             AND (h.realizado > 0 OR h.pendientes = 0)
            THEN h.realizado END AS minutos_realizados,
       CASE WHEN h.habito = N'ACTIVIDAD_FISICA'
            THEN m.valor_meta END AS meta_minutos_semanal,
       -- M3 y M4: contacto social.
       CASE WHEN h.habito = N'CONTACTO_SOCIAL'
             AND (h.realizado > 0 OR h.pendientes = 0)
            THEN CONVERT(INT, h.realizado) END AS dias_con_contacto,
       CASE WHEN h.habito = N'CONTACTO_SOCIAL'
            THEN m.valor_meta END AS meta_dias_semanal,
       -- Distinguir los días pendientes de una actividad cero confirmada.
       CASE
           WHEN m.meta_id IS NULL THEN 'SIN_META'
           WHEN h.pendientes > 0 THEN 'PENDIENTE'
           WHEN DATEADD(DAY, 6, h.inicio_semana) >= h.fecha_corte THEN 'EN_CURSO'
           ELSE 'CONFIRMADO'
       END AS estado_datos,
       h.fecha_corte
FROM HabitosAgrupados AS h
LEFT JOIN [dbo].[meta_semanal] AS m
    ON m.persona_id = h.id_persona
   AND m.habito = h.habito
   AND m.inicio_semana = h.inicio_semana
   AND m.vigente = 1
INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_META] AS dm
    ON dm.id_meta COLLATE DATABASE_DEFAULT = CASE
        WHEN m.meta_id IS NULL THEN N'SIN_META'
        ELSE N'SEM:' + CONVERT(NVARCHAR(12), m.meta_id)
    END;
GO

-- ============================================================================
-- VISTA DEL HECHO 2: CONTROLES CARDIOMETABÓLICOS MENSUALES (M5, M6).
-- Una persona, un mes y un factor = una fila, incluso si no está programado.
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[v_HechoControlesCardiometabolicosMensuales]
AS
WITH ControlesBase AS (
    SELECT p.key_persona, t.key_tiempo, p.key_ubicacion,
           s.key_tipo_seguimiento, p.fecha_corte,
           c.control_id, c.id_meta, c.id_tipo_seguimiento, c.vigente,
           c.tiene_meta_prevista, c.meta_evaluable,
           c.unidad AS unidad_meta,
           c.valor_meta_min, c.valor_meta_max, c.valor_meta_max_diast,
           r.id_origen_resultado, r.validado, r.es_referencia, r.dentro_de_meta,
           r.unidad AS unidad_resultado,
           r.valor_numerico, r.valor_sistolica, r.valor_diastolica
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON DAY(t.id_tiempo) = 1
       AND t.id_tiempo <= p.fecha_corte
       AND EOMONTH(t.id_tiempo) >= p.inicio_seguimiento
    CROSS JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] AS s
    LEFT JOIN [dbo].[v_DatosControlProgramado] AS c
        ON c.persona_id = p.id_persona
       AND c.mes_periodo = t.id_tiempo
       AND c.id_tipo_seguimiento = s.id_tipo_seguimiento COLLATE DATABASE_DEFAULT
    -- Elegir un solo resultado: primero la referencia, si no el último registrado.
    LEFT JOIN [dbo].[v_DatosResultados] AS r
        ON r.resultado_id = (
            SELECT TOP (1) resultado.resultado_id
            FROM [dbo].[v_DatosResultados] AS resultado
            WHERE resultado.control_id = c.control_id
              AND resultado.persona_id = p.id_persona
              AND resultado.tipo_control = c.tipo_control
              AND resultado.fecha_medicion >= t.id_tiempo
              AND resultado.fecha_medicion < DATEADD(MONTH, 1, t.id_tiempo)
              AND resultado.fecha_medicion < DATEADD(DAY, 1, p.fecha_corte)
            ORDER BY resultado.es_referencia DESC,
                     resultado.fecha_medicion DESC,
                     resultado.resultado_id DESC
        )
    WHERE s.periodicidad = N'MENSUAL'
      AND p.en_rango = 1
), Comparacion AS (
    -- Comparar sólo con los límites individuales registrados en el OLTP.
    SELECT b.*,
           CASE
               WHEN b.meta_evaluable = 1 AND b.id_tipo_seguimiento = N'PRESION_ARTERIAL'
               THEN CASE WHEN b.valor_sistolica <= b.valor_meta_max
                           AND b.valor_diastolica <= b.valor_meta_max_diast
                         THEN 1 ELSE 0 END
               WHEN b.meta_evaluable = 1
               THEN CASE WHEN (b.valor_meta_min IS NULL OR b.valor_numerico >= b.valor_meta_min)
                           AND (b.valor_meta_max IS NULL OR b.valor_numerico <= b.valor_meta_max)
                         THEN 1 ELSE 0 END
           END AS dentro_calculado
    FROM ControlesBase AS b
), Evaluacion AS (
    -- Para sumar M5, la referencia debe ser válida y coherente con la meta.
    SELECT c.*,
           CASE
               WHEN c.tiene_meta_prevista = 1
                AND c.meta_evaluable = 1
                AND c.validado = 1
                AND c.es_referencia = 1
                AND c.unidad_resultado = c.unidad_meta
                AND c.dentro_de_meta IS NOT NULL
                AND c.dentro_de_meta = c.dentro_calculado
               THEN 1 ELSE 0
           END AS evaluable
    FROM Comparacion AS c
)
SELECT e.key_persona, e.key_tiempo, e.key_ubicacion, e.key_tipo_seguimiento,
       o.key_origen_resultado, dm.key_meta,
       CASE WHEN e.evaluable = 1 AND e.dentro_de_meta = 1
            THEN 1 ELSE 0 END AS factores_dentro_meta, -- M5
       ISNULL(e.tiene_meta_prevista, 0) AS factores_previstos, -- M6
       CASE
           WHEN e.control_id IS NULL THEN 'NO_PROGRAMADO'
           WHEN e.vigente = 0 THEN 'NO_VIGENTE'
           WHEN e.tiene_meta_prevista = 0 THEN 'SIN_META'
           WHEN e.meta_evaluable = 0 THEN 'META_INCOMPLETA'
           WHEN e.evaluable = 0 THEN 'PENDIENTE'
           WHEN e.dentro_de_meta = 1 THEN 'DENTRO_META'
           ELSE 'FUERA_META'
       END AS estado_datos,
       e.fecha_corte
FROM Evaluacion AS e
INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_ORIGEN_RESULTADO] AS o
    ON o.id_origen_resultado COLLATE DATABASE_DEFAULT =
       ISNULL(e.id_origen_resultado, N'SIN_RESULTADO')
INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_META] AS dm
    ON dm.id_meta COLLATE DATABASE_DEFAULT = ISNULL(e.id_meta, N'SIN_META');
GO
-- G1 | PASO 03. ETL DE DIMENSIONES
-- dim = destino dimensional; oltp = datos preparados del origen.
-- MERGE compara los identificadores de origen. No compara las KEY autoincrementables.
-- Se trabaja desde el OLTP, y el destino se indica con BD.esquema.tabla.
-- HOLDLOCK protege la coincidencia del MERGE durante la carga.
USE [prevencion_cognitiva_oltp];
GO

SET NOCOUNT ON;
SET LANGUAGE Spanish; -- Nombres de meses y días en español.
SET DATEFIRST 1;      -- Lunes = 1; domingo = 7.

-- Fecha local de Perú, incluso si SQL Server se encuentra en la nube.
DECLARE @fecha_corte DATE = CONVERT(DATE, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SA Pacific Standard Time');

SET XACT_ABORT ON;
IF @@TRANCOUNT <> 0
    THROW 50002, N'Ejecute el ETL sin una transacción externa.', 1;

DROP TABLE IF EXISTS #DatosPersona, #Calendario;

BEGIN TRY
    BEGIN TRANSACTION;

    ---------------------------------------------------------------------------
    -- D1. DIM_PERSONA: preparar la edad y cargar por id_persona.
    ---------------------------------------------------------------------------
    -- Se resta un año si aún no llegó el cumpleaños del año del corte.
    -- DATEADD(YEAR, n, fecha) suma n años a una fecha.
    SELECT p.id_persona, p.estado, p.fecha_nacimiento, p.fecha_alta,
           p.sexo, p.nombres,
           YEAR(@fecha_corte) - YEAR(p.fecha_nacimiento)
           - CASE
                 WHEN DATEADD(YEAR, YEAR(@fecha_corte) - YEAR(p.fecha_nacimiento),
                              p.fecha_nacimiento) > @fecha_corte THEN 1
                 ELSE 0
             END AS edad
    INTO #DatosPersona
    FROM [dbo].[v_DatosDimPersona] AS p;

    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_PERSONA] WITH (HOLDLOCK) AS dim
    USING (
        SELECT id_persona, estado, fecha_nacimiento, fecha_alta, sexo,
               nombres,
               CASE
                   WHEN edad BETWEEN 30 AND 39 THEN N'30-39'
                   WHEN edad BETWEEN 40 AND 49 THEN N'40-49'
                   WHEN edad BETWEEN 50 AND 59 THEN N'50-59'
                   WHEN edad BETWEEN 60 AND 65 THEN N'60-65'
                   ELSE N'FUERA_RANGO'
               END AS grupo_edad
        FROM #DatosPersona
    ) AS oltp
    ON dim.id_persona = oltp.id_persona
    WHEN MATCHED THEN
        UPDATE SET
            dim.estado           = oltp.estado,
            dim.grupo_edad       = oltp.grupo_edad,
            dim.fecha_nacimiento = oltp.fecha_nacimiento,
            dim.fecha_alta       = oltp.fecha_alta,
            dim.sexo             = oltp.sexo,
            dim.nombres          = oltp.nombres
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (estado, grupo_edad, fecha_nacimiento, fecha_alta, sexo,
                nombres, id_persona)
        VALUES (oltp.estado, oltp.grupo_edad, oltp.fecha_nacimiento,
                oltp.fecha_alta, oltp.sexo, oltp.nombres, oltp.id_persona);

    ---------------------------------------------------------------------------
    -- D2. DIM_TIEMPO: un calendario continuo, incluso sin registros.
    ---------------------------------------------------------------------------
    DECLARE @desde DATE;
    SELECT @desde = MIN(inicio_seguimiento)
    FROM [dbo].[v_InicioSeguimiento]
    WHERE inicio_seguimiento <= @fecha_corte;

    SET @desde = ISNULL(@desde, @fecha_corte);
    -- DATEFROMPARTS(año, mes, día) construye una fecha.
    SET @desde = DATEFROMPARTS(YEAR(@desde), MONTH(@desde), 1);
    -- Retroceder al lunes: si la fecha es martes (2), se resta un día.
    SET @desde = DATEADD(DAY, 1 - DATEPART(WEEKDAY, @desde), @desde);

    -- WITH construye el calendario: comienza en @desde y añade un día cada vez.
    ;WITH Calendario AS (
        SELECT @desde AS fecha
        UNION ALL
        SELECT DATEADD(DAY, 1, fecha)
        FROM Calendario
        WHERE fecha < @fecha_corte
    )
    SELECT fecha
    INTO #Calendario
    FROM Calendario
    OPTION (MAXRECURSION 0); -- Permite calendarios de más de 100 días.

    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] WITH (HOLDLOCK) AS dim
    USING (
        SELECT YEAR(fecha) AS anio,
               DATEPART(QUARTER, fecha) AS trimestre,
               MONTH(fecha) AS mes,
               DATEPART(ISO_WEEK, fecha) AS semana,
               DAY(fecha) AS dia,
               DATENAME(WEEKDAY, fecha) AS dia_semana,
               fecha AS id_tiempo
        FROM #Calendario
    ) AS oltp
    ON dim.id_tiempo = oltp.id_tiempo
    WHEN MATCHED THEN
        UPDATE SET
            dim.anio            = oltp.anio,
            dim.trimestre       = oltp.trimestre,
            dim.mes             = oltp.mes,
            dim.semana          = oltp.semana,
            dim.dia             = oltp.dia,
            dim.dia_semana      = oltp.dia_semana
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (anio, trimestre, mes, semana, dia, dia_semana, id_tiempo)
        VALUES (oltp.anio, oltp.trimestre, oltp.mes, oltp.semana,
                oltp.dia, oltp.dia_semana, oltp.id_tiempo);

    ---------------------------------------------------------------------------
    -- D3. DIM_UBICACION
    ---------------------------------------------------------------------------
    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_UBICACION] WITH (HOLDLOCK) AS dim
    USING (
        SELECT pais, departamento, provincia, ciudad, distrito, id_ubicacion
        FROM [dbo].[v_DatosDimUbicacion]
    ) AS oltp
    ON dim.id_ubicacion = oltp.id_ubicacion
    WHEN MATCHED THEN
        UPDATE SET
            dim.pais         = oltp.pais,
            dim.departamento = oltp.departamento,
            dim.provincia    = oltp.provincia,
            dim.ciudad       = oltp.ciudad,
            dim.distrito     = oltp.distrito
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (pais, departamento, provincia, ciudad, distrito, id_ubicacion)
        VALUES (oltp.pais, oltp.departamento, oltp.provincia, oltp.ciudad,
                oltp.distrito, oltp.id_ubicacion);

    ---------------------------------------------------------------------------
    -- D4. DIM_TIPO_SEGUIMIENTO
    ---------------------------------------------------------------------------
    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_TIPO_SEGUIMIENTO] WITH (HOLDLOCK) AS dim
    USING (
        SELECT periodicidad, tipo_seguimiento, tipo_control,
               unidad_medida, id_tipo_seguimiento
        FROM [dbo].[v_DatosDimTipoSeguimiento]
    ) AS oltp
    ON dim.id_tipo_seguimiento COLLATE DATABASE_DEFAULT = oltp.id_tipo_seguimiento
    WHEN MATCHED THEN
        UPDATE SET
            dim.periodicidad     = oltp.periodicidad,
            dim.tipo_seguimiento = oltp.tipo_seguimiento,
            dim.tipo_control     = oltp.tipo_control,
            dim.unidad_medida    = oltp.unidad_medida
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (periodicidad, tipo_seguimiento, tipo_control,
                unidad_medida, id_tipo_seguimiento)
        VALUES (oltp.periodicidad, oltp.tipo_seguimiento, oltp.tipo_control,
                oltp.unidad_medida, oltp.id_tipo_seguimiento);

    ---------------------------------------------------------------------------
    -- D5. DIM_ORIGEN_RESULTADO
    ---------------------------------------------------------------------------
    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_ORIGEN_RESULTADO] WITH (HOLDLOCK) AS dim
    USING (
        SELECT origen_resultado, estado_validacion,
               resultado_referencia, id_origen_resultado
        FROM [dbo].[v_DatosDimOrigenResultado]
    ) AS oltp
    ON dim.id_origen_resultado COLLATE DATABASE_DEFAULT = oltp.id_origen_resultado
    WHEN MATCHED THEN
        UPDATE SET
            dim.origen_resultado     = oltp.origen_resultado,
            dim.estado_validacion    = oltp.estado_validacion,
            dim.resultado_referencia = oltp.resultado_referencia
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (origen_resultado, estado_validacion,
                resultado_referencia, id_origen_resultado)
        VALUES (oltp.origen_resultado, oltp.estado_validacion,
                oltp.resultado_referencia, oltp.id_origen_resultado);

    ---------------------------------------------------------------------------
    -- D6. DIM_META
    ---------------------------------------------------------------------------
    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_META] WITH (HOLDLOCK) AS dim
    USING (
        SELECT tipo_meta, criterio_meta, unidad, origen_meta, version_meta,
               vigencia, id_meta
        FROM [dbo].[v_DatosDimMeta]
    ) AS oltp
    ON dim.id_meta COLLATE DATABASE_DEFAULT = oltp.id_meta
    WHEN MATCHED THEN
        UPDATE SET
            dim.tipo_meta            = oltp.tipo_meta,
            dim.criterio_meta        = oltp.criterio_meta,
            dim.unidad               = oltp.unidad,
            dim.origen_meta          = oltp.origen_meta,
            dim.version_meta         = oltp.version_meta,
            dim.vigencia            = oltp.vigencia
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (tipo_meta, criterio_meta, unidad, origen_meta, version_meta, vigencia, id_meta)
        VALUES (oltp.tipo_meta, oltp.criterio_meta, oltp.unidad, oltp.origen_meta,
                oltp.version_meta, oltp.vigencia, oltp.id_meta);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

DROP TABLE IF EXISTS #DatosPersona, #Calendario;

SELECT N'DIMENSIONES CARGADAS' AS resultado, @fecha_corte AS fecha_corte;
GO
-- G1 | PASO 04. ETL DE LOS DOS HECHOS
-- Ejecutar desde la BD transaccional, después de cargar las dimensiones.
-- Se usa el mismo método del ingeniero: DELETE + INSERT INTO ... SELECT FROM vista.
-- Los DELETE sólo afectan las tablas de hechos del Data Mart.

USE [prevencion_cognitiva_oltp];
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
    SELECT DISTINCT p.key_persona, DATETRUNC(ISO_WEEK, t.id_tiempo) AS inicio_semana
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.id_tiempo BETWEEN p.inicio_seguimiento AND p.fecha_corte
    WHERE p.en_rango = 1
) AS semanas;

SELECT @controles_esperados = COUNT_BIG(*) * 4
FROM (
    SELECT DISTINCT p.key_persona, DATETRUNC(MONTH, t.id_tiempo) AS inicio_mes
    FROM [dbo].[v_PersonasETL] AS p
    INNER JOIN [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] AS t
        ON t.id_tiempo BETWEEN p.inicio_seguimiento AND p.fecha_corte
    WHERE p.en_rango = 1
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

