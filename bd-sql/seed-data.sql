-- =============================================================================
-- SCRIPT DE INICIALIZACIÓN Y SEED DE DATOS (SQL SERVER)
-- Base de Datos: prevencion_cognitiva_oltp
-- Proyecto: Prevención del Deterioro Cognitivo mediante Hábitos Diarios (G1)
-- =============================================================================

USE prevencion_cognitiva_oltp;
GO

SET NOCOUNT ON;

-- -----------------------------------------------------------------------------
-- 1. UBICACION (Distritos del Piloto en Trujillo, Perú)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM ubicacion WHERE distrito = 'Trujillo')
BEGIN
    INSERT INTO ubicacion (pais, departamento, provincia, distrito) VALUES
    ('Perú', 'La Libertad', 'Trujillo', 'Trujillo'),
    ('Perú', 'La Libertad', 'Trujillo', 'Víctor Larco Herrera'),
    ('Perú', 'La Libertad', 'Trujillo', 'Huanchaco'),
    ('Perú', 'La Libertad', 'Trujillo', 'La Esperanza'),
    ('Perú', 'La Libertad', 'Trujillo', 'El Porvenir'),
    ('Perú', 'La Libertad', 'Trujillo', 'Moche');
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
-- 8. RECORDATORIOS PROGRAMADOS PARA P-001
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
