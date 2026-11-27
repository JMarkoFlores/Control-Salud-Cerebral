-- G1 | PASO 03. ETL DE DIMENSIONES
-- dim = destino dimensional; oltp = datos preparados del origen.
-- MERGE compara los identificadores de origen. No compara las KEY autoincrementables.
-- Se trabaja desde el OLTP, y el destino se indica con BD.esquema.tabla.
-- HOLDLOCK protege la coincidencia del MERGE durante la carga.
USE [prevencion_cognitiva];
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
           p.sexo, p.codigo_interno, p.nombres, p.apellidos,
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
               codigo_interno, nombres, apellidos,
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
            dim.codigo_interno   = oltp.codigo_interno,
            dim.nombres          = oltp.nombres,
            dim.apellidos        = oltp.apellidos
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (estado, grupo_edad, fecha_nacimiento, fecha_alta, sexo,
                codigo_interno, nombres, apellidos, id_persona)
        VALUES (oltp.estado, oltp.grupo_edad, oltp.fecha_nacimiento,
                oltp.fecha_alta, oltp.sexo, oltp.codigo_interno,
                oltp.nombres, oltp.apellidos, oltp.id_persona);

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
    SELECT fecha,
           DATEADD(DAY, 1 - DATEPART(WEEKDAY, fecha), fecha) AS inicio_semana
    INTO #Calendario
    FROM Calendario
    OPTION (MAXRECURSION 0); -- Permite calendarios de más de 100 días.

    MERGE [prevencion_cognitiva_mart].[dbo].[DIM_TIEMPO] WITH (HOLDLOCK) AS dim
    USING (
        SELECT YEAR(fecha) AS anio,
               DATEPART(QUARTER, fecha) AS trimestre,
               MONTH(fecha) AS mes,
               DATENAME(MONTH, fecha) AS nombre_mes,
               YEAR(DATEADD(DAY, 3, inicio_semana)) AS anio_semana_iso,
               DATEPART(ISO_WEEK, fecha) AS semana_iso,
               inicio_semana,
               DATEFROMPARTS(YEAR(fecha), MONTH(fecha), 1) AS inicio_mes,
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
            dim.nombre_mes      = oltp.nombre_mes,
            dim.anio_semana_iso = oltp.anio_semana_iso,
            dim.semana_iso      = oltp.semana_iso,
            dim.inicio_semana   = oltp.inicio_semana,
            dim.inicio_mes      = oltp.inicio_mes,
            dim.dia             = oltp.dia,
            dim.dia_semana      = oltp.dia_semana
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (anio, trimestre, mes, nombre_mes, anio_semana_iso, semana_iso,
                inicio_semana, inicio_mes, dia, dia_semana, id_tiempo)
        VALUES (oltp.anio, oltp.trimestre, oltp.mes, oltp.nombre_mes,
                oltp.anio_semana_iso, oltp.semana_iso, oltp.inicio_semana,
                oltp.inicio_mes, oltp.dia, oltp.dia_semana, oltp.id_tiempo);

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
               vigente, inicio_vigencia, fecha_prevista, fecha_registro,
               valor_meta_min, valor_meta_max, valor_meta_max_diast, id_meta
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
            dim.vigente              = oltp.vigente,
            dim.inicio_vigencia      = oltp.inicio_vigencia,
            dim.fecha_prevista       = oltp.fecha_prevista,
            dim.fecha_registro       = oltp.fecha_registro,
            dim.valor_meta_min       = oltp.valor_meta_min,
            dim.valor_meta_max       = oltp.valor_meta_max,
            dim.valor_meta_max_diast  = oltp.valor_meta_max_diast
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (tipo_meta, criterio_meta, unidad, origen_meta, version_meta, vigente,
                inicio_vigencia, fecha_prevista, fecha_registro,
                valor_meta_min, valor_meta_max, valor_meta_max_diast, id_meta)
        VALUES (oltp.tipo_meta, oltp.criterio_meta, oltp.unidad, oltp.origen_meta,
                oltp.version_meta, oltp.vigente, oltp.inicio_vigencia,
                oltp.fecha_prevista, oltp.fecha_registro, oltp.valor_meta_min,
                oltp.valor_meta_max, oltp.valor_meta_max_diast, oltp.id_meta);

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
