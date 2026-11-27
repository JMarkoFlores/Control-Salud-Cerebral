-- =============================================================================
-- SCRIPT DE INICIALIZACIÓN Y SEED DE DATOS (SQL SERVER)
-- Base de Datos: prevencion_cognitiva_oltp
-- Proyecto: Prevención del Deterioro Cognitivo mediante Hábitos Diarios (G1)
-- =============================================================================

USE prevencion_cognitiva_oltp;
GO

SET NOCOUNT ON;

-- -----------------------------------------------------------------------------
-- 1. UBICACION (Distritos del Piloto en la ciudad de Trujillo, Perú)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM ubicacion WHERE distrito = 'Trujillo')
BEGIN
    INSERT INTO ubicacion (pais, departamento, provincia, ciudad, distrito) VALUES
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'Trujillo'),
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'Víctor Larco Herrera'),
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'Huanchaco'),
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'La Esperanza'),
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'El Porvenir'),
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo', 'Moche');
END
GO

-- -----------------------------------------------------------------------------
-- 2. PERSONA (Titulares del piloto 30-65 años y administrador)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM persona WHERE codigo_interno = 'P-000')
BEGIN
    INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
    VALUES ('P-000', 'Administrador', 'Sistema Piloto', '1985-01-01', 'M', 1, 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM persona WHERE codigo_interno = 'P-001')
BEGIN
    INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
    VALUES ('P-001', 'Carlos Alberto', 'Mendoza Díaz', '1976-05-14', 'M', 1, 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM persona WHERE codigo_interno = 'P-002')
BEGIN
    INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
    VALUES ('P-002', 'María Elena', 'Flores Ramos', '1968-09-20', 'F', 2, 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM persona WHERE codigo_interno = 'P-003')
BEGIN
    INSERT INTO persona (codigo_interno, nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, activo)
    VALUES ('P-003', 'Jorge Luis', 'Paredes Quispe', '1982-11-03', 'M', 3, 1);
END
GO

-- -----------------------------------------------------------------------------
-- 3. CUENTA_ROL (Credenciales con bcrypt real para los 3 roles)
-- Contraseñas de prueba:
-- Admin:        admin@saludcerebral.pe    / Admin123!
-- Titular:      carlos.mendoza@gmail.com  / Titular123!
-- Titular 2:    maria.flores@gmail.com    / Titular123!
-- -----------------------------------------------------------------------------
DECLARE @id_admin INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-000');
DECLARE @id_carlos INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-001');
DECLARE @id_maria INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-002');

IF NOT EXISTS (SELECT 1 FROM cuenta_rol WHERE correo_acceso = 'admin@saludcerebral.pe')
BEGIN
    INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado, nombre_contacto, parentesco)
    VALUES (@id_admin, 'admin@saludcerebral.pe', '$2a$10$5TDbp.kVFBjHmmHaGak7s.lWe8KsOSuKFzBW2SmSKrP2T5IRJzchS', 'ADMIN', 1, 'Administrador Central', 'Equipo G1');
END

IF NOT EXISTS (SELECT 1 FROM cuenta_rol WHERE correo_acceso = 'carlos.mendoza@gmail.com')
BEGIN
    INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado, nombre_contacto, parentesco)
    VALUES (@id_carlos, 'carlos.mendoza@gmail.com', '$2a$10$dfELO2aC5ihKj.HizwrUY.DqwX2KTD7l6SDMKRvwRbbhZFbrmzBda', 'TITULAR', 1, 'Carlos Mendoza', 'Titular');
END

IF NOT EXISTS (SELECT 1 FROM cuenta_rol WHERE correo_acceso = 'maria.flores@gmail.com')
BEGIN
    INSERT INTO cuenta_rol (persona_titular_id, correo_acceso, password_hash, rol, autorizado, nombre_contacto, parentesco)
    VALUES (@id_maria, 'maria.flores@gmail.com', '$2a$10$dfELO2aC5ihKj.HizwrUY.DqwX2KTD7l6SDMKRvwRbbhZFbrmzBda', 'TITULAR', 1, 'María Flores', 'Titular');
END
GO

-- -----------------------------------------------------------------------------
-- 4. REGLA_ALERTA (Catálogo de reglas de seguimiento y motivación)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM regla_alerta WHERE codigo_regla = 'REG-01')
    INSERT INTO regla_alerta (codigo_regla, nombre_regla, version_regla, frecuencia, tipo_activacion, activa)
    VALUES ('REG-01', 'Dato de hábito sin confirmar', '1.0', 'DIARIA', 'VERIFICACION_DIARIA_HABITOS', 1);

IF NOT EXISTS (SELECT 1 FROM regla_alerta WHERE codigo_regla = 'REG-02')
    INSERT INTO regla_alerta (codigo_regla, nombre_regla, version_regla, frecuencia, tipo_activacion, activa)
    VALUES ('REG-02', 'Meta semanal sin alcanzar al cierre', '1.0', 'SEMANAL', 'CIERRE_SEMANAL_DOMINGO', 1);

IF NOT EXISTS (SELECT 1 FROM regla_alerta WHERE codigo_regla = 'REG-03')
    INSERT INTO regla_alerta (codigo_regla, nombre_regla, version_regla, frecuencia, tipo_activacion, activa)
    VALUES ('REG-03', 'Control cardiometabólico vencido sin resultado', '1.0', 'MENSUAL', 'VENCIMIENTO_CONTROL_MENSUAL', 1);

IF NOT EXISTS (SELECT 1 FROM regla_alerta WHERE codigo_regla = 'REG-04')
    INSERT INTO regla_alerta (codigo_regla, nombre_regla, version_regla, frecuencia, tipo_activacion, activa)
    VALUES ('REG-04', 'Motivación diaria de hábito', '1.0', 'DIARIA', 'MOTIVACION_DIARIA_PROACTIVA', 1);
GO

-- -----------------------------------------------------------------------------
-- 5. CATALOGO_LOGRO (Medallas del sistema para adultos 30-65)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-01')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-01', 'Primer Paso Activo', 'Registraste tu primera sesión de actividad física válida en el piloto.', 1);

IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-02')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-02', 'Semana Dorada Física', 'Completaste el 100% o más de tu meta semanal de minutos de ejercicio.', 1);

IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-03')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-03', 'Vínculo Social Constante', 'Cumpliste tu meta semanal de días con interacción social significativa.', 1);

IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-04')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-04', 'Corazón y Mente Protegidos', 'Registraste todos tus controles cardiometabólicos del mes dentro de la meta.', 1);

IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-05')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-05', 'Constancia Trujillana', 'Confirmaste 7 días completos sin dejar pendientes en la semana.', 1);

IF NOT EXISTS (SELECT 1 FROM catalogo_logro WHERE codigo_logro = 'LOG-06')
    INSERT INTO catalogo_logro (codigo_logro, nombre, descripcion, activo)
    VALUES ('LOG-06', 'Puntaje de Excelencia', 'Alcanzaste un Puntaje de Salud Cerebral superior a 80 puntos.', 1);
GO

-- -----------------------------------------------------------------------------
-- 6. METAS SEMANALES INICIALES PARA P-001 (Semana actual)
-- -----------------------------------------------------------------------------
DECLARE @id_carlos_meta INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-001');
DECLARE @lunes_actual DATE = DATEADD(day, 1 - DATEPART(dw, GETDATE()), CAST(GETDATE() AS DATE));
-- Ajustar lunes si SQL Server tiene DATEFIRST diferente
IF DATEPART(dw, @lunes_actual) <> 2
BEGIN
    SET @lunes_actual = DATEADD(day, - ((DATEPART(dw, GETDATE()) + 5) % 7), CAST(GETDATE() AS DATE));
END

IF NOT EXISTS (SELECT 1 FROM meta_semanal WHERE persona_id = @id_carlos_meta AND habito = 'ACTIVIDAD_FISICA' AND inicio_semana = @lunes_actual)
BEGIN
    INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
    VALUES (@id_carlos_meta, 'ACTIVIDAD_FISICA', @lunes_actual, 150, 'MINUTOS', 1, 'ACORDADA', 1);
END

IF NOT EXISTS (SELECT 1 FROM meta_semanal WHERE persona_id = @id_carlos_meta AND habito = 'CONTACTO_SOCIAL' AND inicio_semana = @lunes_actual)
BEGIN
    INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
    VALUES (@id_carlos_meta, 'CONTACTO_SOCIAL', @lunes_actual, 3, 'DIAS', 1, 'ACORDADA', 1);
END
GO

-- -----------------------------------------------------------------------------
-- 7. CONTROLES PROGRAMADOS DEL MES (P-001)
-- -----------------------------------------------------------------------------
DECLARE @id_carlos_ctrl INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-001');
DECLARE @primer_dia_mes DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
DECLARE @fecha_prevista DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 20);

IF NOT EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @id_carlos_ctrl AND tipo_control = 'Presión arterial' AND mes_periodo = @primer_dia_mes)
BEGIN
    INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, valor_meta_max_diast, unidad, vigente)
    VALUES (@id_carlos_ctrl, 'Presión arterial', @primer_dia_mes, @fecha_prevista, '<= 120/80 mmHg', 120.0, 80.0, 'mmHg', 1);
END

IF NOT EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @id_carlos_ctrl AND tipo_control = 'Glucosa' AND mes_periodo = @primer_dia_mes)
BEGIN
    INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
    VALUES (@id_carlos_ctrl, 'Glucosa', @primer_dia_mes, @fecha_prevista, '70 - 100 mg/dL', 70.0, 100.0, 'mg/dL', 1);
END

IF NOT EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @id_carlos_ctrl AND tipo_control = 'Colesterol LDL' AND mes_periodo = @primer_dia_mes)
BEGIN
    INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, unidad, vigente)
    VALUES (@id_carlos_ctrl, 'Colesterol LDL', @primer_dia_mes, @fecha_prevista, '< 100 mg/dL', 100.0, 'mg/dL', 1);
END

IF NOT EXISTS (SELECT 1 FROM control_programado WHERE persona_id = @id_carlos_ctrl AND tipo_control = 'IMC' AND mes_periodo = @primer_dia_mes)
BEGIN
    INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
    VALUES (@id_carlos_ctrl, 'IMC', @primer_dia_mes, @fecha_prevista, '18.5 - 24.9 kg/m²', 18.5, 24.9, 'kg/m²', 1);
END
GO

-- -----------------------------------------------------------------------------
-- 8. DATOS DE DEMOSTRACIÓN PARA EL DASHBOARD BI
-- Genera 6 semanas (5 cerradas + la actual) y 2 meses (anterior + actual) para
-- Carlos, María y Jorge. Así el dashboard tiene periodos cerrados con metas,
-- actividad/contacto, confirmaciones y resultados cardiometabólicos.
-- Es idempotente: cada INSERT evita duplicados con NOT EXISTS.
-- -----------------------------------------------------------------------------
DECLARE @id_carlos_demo INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-001');
DECLARE @id_maria_demo  INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-002');
DECLARE @id_jorge_demo  INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-003');
DECLARE @lunes_demo DATE = DATETRUNC(ISO_WEEK, CAST(GETDATE() AS DATE));
DECLARE @primer_dia_demo DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
DECLARE @mes_anterior_demo DATE = DATEADD(MONTH, -1, @primer_dia_demo);

-- 8.1 Metas semanales para todas las semanas del demo y los tres participantes.
;WITH Semanas AS (
    SELECT DATEADD(WEEK, -n, @lunes_demo) AS inicio_semana
    FROM (VALUES (0), (1), (2), (3), (4), (5)) AS v(n)
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id, 150 AS meta_actividad, 3 AS meta_social
    UNION ALL SELECT @id_maria_demo, 150, 3
    UNION ALL SELECT @id_jorge_demo, 150, 3
)
INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
SELECT p.persona_id, 'ACTIVIDAD_FISICA', s.inicio_semana, p.meta_actividad, 'MINUTOS', 1, 'ACORDADA', 1
FROM Participantes p
CROSS JOIN Semanas s
WHERE NOT EXISTS (
    SELECT 1 FROM meta_semanal m
    WHERE m.persona_id = p.persona_id
      AND m.habito = 'ACTIVIDAD_FISICA'
      AND m.inicio_semana = s.inicio_semana
);

;WITH Semanas AS (
    SELECT DATEADD(WEEK, -n, @lunes_demo) AS inicio_semana
    FROM (VALUES (0), (1), (2), (3), (4), (5)) AS v(n)
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id, 150 AS meta_actividad, 3 AS meta_social
    UNION ALL SELECT @id_maria_demo, 150, 3
    UNION ALL SELECT @id_jorge_demo, 150, 3
)
INSERT INTO meta_semanal (persona_id, habito, inicio_semana, valor_meta, unidad, version_meta, origen_meta, vigente)
SELECT p.persona_id, 'CONTACTO_SOCIAL', s.inicio_semana, p.meta_social, 'DIAS', 1, 'ACORDADA', 1
FROM Participantes p
CROSS JOIN Semanas s
WHERE NOT EXISTS (
    SELECT 1 FROM meta_semanal m
    WHERE m.persona_id = p.persona_id
      AND m.habito = 'CONTACTO_SOCIAL'
      AND m.inicio_semana = s.inicio_semana
);

-- 8.2 Sesiones de actividad física: Carlos 150 min, María 120 min, Jorge 75 min.
;WITH Semanas AS (
    SELECT DATEADD(WEEK, -n, @lunes_demo) AS inicio_semana
    FROM (VALUES (0), (1), (2), (3), (4), (5)) AS v(n)
), Sesiones AS (
    SELECT @id_carlos_demo AS persona_id, 1 AS dia_offset, 75 AS minutos
    UNION ALL SELECT @id_carlos_demo, 3, 75
    UNION ALL SELECT @id_maria_demo, 1, 60
    UNION ALL SELECT @id_maria_demo, 3, 60
    UNION ALL SELECT @id_jorge_demo, 1, 75
)
INSERT INTO sesion_fisica (persona_id, fecha_hora, tipo_actividad, duracion_minutos, origen, estado)
SELECT s.persona_id,
       DATEADD(HOUR, 7, DATEADD(DAY, s.dia_offset, CAST(w.inicio_semana AS DATETIME2))),
       'Caminata', s.minutos, 'Autorreporte', 'VALIDO'
FROM Sesiones s
CROSS JOIN Semanas w
WHERE NOT EXISTS (
    SELECT 1 FROM sesion_fisica x
    WHERE x.persona_id = s.persona_id
      AND x.fecha_hora = DATEADD(HOUR, 7, DATEADD(DAY, s.dia_offset, CAST(w.inicio_semana AS DATETIME2)))
);

-- 8.3 Contactos sociales: Carlos 3 días, María 2 días, Jorge 0 días (0 % confirmado).
;WITH Semanas AS (
    SELECT DATEADD(WEEK, -n, @lunes_demo) AS inicio_semana
    FROM (VALUES (0), (1), (2), (3), (4), (5)) AS v(n)
), Contactos AS (
    SELECT @id_carlos_demo AS persona_id, 1 AS dia_offset
    UNION ALL SELECT @id_carlos_demo, 2
    UNION ALL SELECT @id_carlos_demo, 5
    UNION ALL SELECT @id_maria_demo, 1
    UNION ALL SELECT @id_maria_demo, 4
)
INSERT INTO contacto_social (persona_id, fecha_hora, modalidad, origen, estado)
SELECT c.persona_id,
       DATEADD(HOUR, 18, DATEADD(DAY, c.dia_offset, CAST(w.inicio_semana AS DATETIME2))),
       'Conversación presencial', 'Autorreporte', 'VALIDO'
FROM Contactos c
CROSS JOIN Semanas w
WHERE NOT EXISTS (
    SELECT 1 FROM contacto_social x
    WHERE x.persona_id = c.persona_id
      AND x.fecha_hora = DATEADD(HOUR, 18, DATEADD(DAY, c.dia_offset, CAST(w.inicio_semana AS DATETIME2)))
);

-- 8.4 Confirmaciones diarias: evita que las semanas queden PENDIENTE.
;WITH Semanas AS (
    SELECT DATEADD(WEEK, -n, @lunes_demo) AS inicio_semana
    FROM (VALUES (0), (1), (2), (3), (4), (5)) AS v(n)
), Dias AS (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id
    UNION ALL SELECT @id_maria_demo
    UNION ALL SELECT @id_jorge_demo
), Habitos AS (
    SELECT 'ACTIVIDAD_FISICA' AS habito
    UNION ALL SELECT 'CONTACTO_SOCIAL'
)
INSERT INTO confirmacion_diaria (persona_id, fecha, habito, estado_confirmacion, fecha_confirmacion)
SELECT p.persona_id,
       DATEADD(DAY, d.n, CAST(w.inicio_semana AS DATE)),
       h.habito,
       CASE
           WHEN h.habito = 'ACTIVIDAD_FISICA' AND (
                (p.persona_id = @id_carlos_demo AND d.n IN (1, 3)) OR
                (p.persona_id = @id_maria_demo AND d.n IN (1, 3)) OR
                (p.persona_id = @id_jorge_demo AND d.n IN (1))
           ) THEN 'CONFIRMADO_CON_REGISTRO'
           WHEN h.habito = 'CONTACTO_SOCIAL' AND (
                (p.persona_id = @id_carlos_demo AND d.n IN (1, 2, 5)) OR
                (p.persona_id = @id_maria_demo AND d.n IN (1, 4))
           ) THEN 'CONFIRMADO_CON_REGISTRO'
           ELSE 'CONFIRMADO_SIN_ACTIVIDAD'
       END,
       GETDATE()
FROM Participantes p
CROSS JOIN Habitos h
CROSS JOIN Semanas w
CROSS JOIN Dias d
WHERE DATEADD(DAY, d.n, CAST(w.inicio_semana AS DATE)) <= CAST(GETDATE() AS DATE)
  AND NOT EXISTS (
      SELECT 1 FROM confirmacion_diaria x
      WHERE x.persona_id = p.persona_id
        AND x.fecha = DATEADD(DAY, d.n, CAST(w.inicio_semana AS DATE))
        AND x.habito = h.habito
  );

-- 8.5 Controles cardiometabólicos del mes anterior y del mes actual.
;WITH Meses AS (
    SELECT @mes_anterior_demo AS mes_periodo
    UNION ALL SELECT @primer_dia_demo
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id
    UNION ALL SELECT @id_maria_demo
    UNION ALL SELECT @id_jorge_demo
)
INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, valor_meta_max_diast, unidad, vigente)
SELECT p.persona_id, 'Presión arterial', m.mes_periodo, DATEADD(DAY, 19, m.mes_periodo), '<= 120/80 mmHg', 120.0, 80.0, 'mmHg', 1
FROM Participantes p CROSS JOIN Meses m
WHERE NOT EXISTS (
    SELECT 1 FROM control_programado c
    WHERE c.persona_id = p.persona_id AND c.tipo_control = 'Presión arterial' AND c.mes_periodo = m.mes_periodo
);

;WITH Meses AS (
    SELECT @mes_anterior_demo AS mes_periodo
    UNION ALL SELECT @primer_dia_demo
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id
    UNION ALL SELECT @id_maria_demo
    UNION ALL SELECT @id_jorge_demo
)
INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
SELECT p.persona_id, 'Glucosa', m.mes_periodo, DATEADD(DAY, 19, m.mes_periodo), '70 - 100 mg/dL', 70.0, 100.0, 'mg/dL', 1
FROM Participantes p CROSS JOIN Meses m
WHERE NOT EXISTS (
    SELECT 1 FROM control_programado c
    WHERE c.persona_id = p.persona_id AND c.tipo_control = 'Glucosa' AND c.mes_periodo = m.mes_periodo
);

;WITH Meses AS (
    SELECT @mes_anterior_demo AS mes_periodo
    UNION ALL SELECT @primer_dia_demo
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id
    UNION ALL SELECT @id_maria_demo
    UNION ALL SELECT @id_jorge_demo
)
INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_max, unidad, vigente)
SELECT p.persona_id, 'Colesterol LDL', m.mes_periodo, DATEADD(DAY, 19, m.mes_periodo), '< 100 mg/dL', 100.0, 'mg/dL', 1
FROM Participantes p CROSS JOIN Meses m
WHERE NOT EXISTS (
    SELECT 1 FROM control_programado c
    WHERE c.persona_id = p.persona_id AND c.tipo_control = 'Colesterol LDL' AND c.mes_periodo = m.mes_periodo
);

;WITH Meses AS (
    SELECT @mes_anterior_demo AS mes_periodo
    UNION ALL SELECT @primer_dia_demo
), Participantes AS (
    SELECT @id_carlos_demo AS persona_id
    UNION ALL SELECT @id_maria_demo
    UNION ALL SELECT @id_jorge_demo
)
INSERT INTO control_programado (persona_id, tipo_control, mes_periodo, fecha_prevista, criterio_meta_texto, valor_meta_min, valor_meta_max, unidad, vigente)
SELECT p.persona_id, 'IMC', m.mes_periodo, DATEADD(DAY, 19, m.mes_periodo), '18.5 - 24.9 kg/m²', 18.5, 24.9, 'kg/m²', 1
FROM Participantes p CROSS JOIN Meses m
WHERE NOT EXISTS (
    SELECT 1 FROM control_programado c
    WHERE c.persona_id = p.persona_id AND c.tipo_control = 'IMC' AND c.mes_periodo = m.mes_periodo
);

-- 8.6 Resultados clínicos: Carlos 4/4, María 3/4, Jorge 2/4 dentro de meta.
;WITH Resultados AS (
    SELECT @id_carlos_demo AS persona_id, 'Presión arterial' AS tipo_control,
           CAST(NULL AS DECIMAL(6,2)) AS valor_numerico,
           CAST(118.0 AS DECIMAL(5,1)) AS valor_sistolica,
           CAST(76.0 AS DECIMAL(5,1)) AS valor_diastolica,
           CAST(1 AS BIT) AS dentro_de_meta
    UNION ALL SELECT @id_carlos_demo, 'Glucosa', CAST(90.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_carlos_demo, 'Colesterol LDL', CAST(90.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_carlos_demo, 'IMC', CAST(22.5 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)

    UNION ALL SELECT @id_maria_demo, 'Presión arterial', CAST(NULL AS DECIMAL(6,2)), CAST(118.0 AS DECIMAL(5,1)), CAST(76.0 AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_maria_demo, 'Glucosa', CAST(95.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_maria_demo, 'Colesterol LDL', CAST(130.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(0 AS BIT)
    UNION ALL SELECT @id_maria_demo, 'IMC', CAST(23.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)

    UNION ALL SELECT @id_jorge_demo, 'Presión arterial', CAST(NULL AS DECIMAL(6,2)), CAST(118.0 AS DECIMAL(5,1)), CAST(76.0 AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_jorge_demo, 'Glucosa', CAST(110.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(0 AS BIT)
    UNION ALL SELECT @id_jorge_demo, 'Colesterol LDL', CAST(90.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(1 AS BIT)
    UNION ALL SELECT @id_jorge_demo, 'IMC', CAST(27.0 AS DECIMAL(6,2)), CAST(NULL AS DECIMAL(5,1)), CAST(NULL AS DECIMAL(5,1)), CAST(0 AS BIT)
)
INSERT INTO resultado_control (control_id, persona_id, tipo_control, fecha_medicion, valor_numerico, valor_sistolica, valor_diastolica, unidad, origen, validado, es_referencia, dentro_de_meta)
SELECT c.control_id, r.persona_id, r.tipo_control, CAST(c.mes_periodo AS DATETIME2),
       r.valor_numerico, r.valor_sistolica, r.valor_diastolica, c.unidad,
       'Laboratorio', 1, 1, r.dentro_de_meta
FROM Resultados r
INNER JOIN control_programado c
    ON c.persona_id = r.persona_id
   AND c.tipo_control = r.tipo_control
   AND c.mes_periodo IN (@mes_anterior_demo, @primer_dia_demo)
WHERE NOT EXISTS (
    SELECT 1 FROM resultado_control x
    WHERE x.control_id = c.control_id
      AND x.es_referencia = 1
);
GO

-- -----------------------------------------------------------------------------
-- 9. RECORDATORIOS PROGRAMADOS PARA P-001
-- -----------------------------------------------------------------------------
DECLARE @id_carlos_rec INT = (SELECT persona_id FROM persona WHERE codigo_interno = 'P-001');

IF NOT EXISTS (SELECT 1 FROM recordatorio WHERE persona_id = @id_carlos_rec AND tipo_aviso = 'ACTIVIDAD_FISICA')
BEGIN
    INSERT INTO recordatorio (persona_id, tipo_aviso, hora_programada, dias_semana, estado, destino_tipo)
    VALUES (@id_carlos_rec, 'ACTIVIDAD_FISICA', '07:00:00', 'L,M,X,J,V', 'ACTIVO', 'REGISTRO_ACTIVIDAD');
END

IF NOT EXISTS (SELECT 1 FROM recordatorio WHERE persona_id = @id_carlos_rec AND tipo_aviso = 'CONTACTO_SOCIAL')
BEGIN
    INSERT INTO recordatorio (persona_id, tipo_aviso, hora_programada, dias_semana, estado, destino_tipo)
    VALUES (@id_carlos_rec, 'CONTACTO_SOCIAL', '18:00:00', 'M,J,S', 'ACTIVO', 'REGISTRO_CONTACTO');
END

IF NOT EXISTS (SELECT 1 FROM recordatorio WHERE persona_id = @id_carlos_rec AND tipo_aviso = 'CONFIRMACION_DIARIA')
BEGIN
    INSERT INTO recordatorio (persona_id, tipo_aviso, hora_programada, dias_semana, estado, destino_tipo)
    VALUES (@id_carlos_rec, 'CONFIRMACION_DIARIA', '21:00:00', 'L,M,X,J,V,S,D', 'ACTIVO', 'CONFIRMACION_DIARIA');
END
GO

PRINT 'Seeds de inicialización insertados exitosamente para prevencion_cognitiva_oltp.';
GO
