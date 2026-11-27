SET NOCOUNT ON;
DECLARE @login sysname = N'$(BI_DB_USER)';
DECLARE @password nvarchar(128) = N'$(BI_DB_PASSWORD)';
DECLARE @statement nvarchar(max);

IF LEN(@password) = 0
    THROW 50201, N'BI_DB_PASSWORD no puede estar vacío.', 1;

IF SUSER_ID(@login) IS NULL
BEGIN
    SET @statement = N'CREATE LOGIN ' + QUOTENAME(@login)
        + N' WITH PASSWORD = ' + QUOTENAME(@password, '''')
        + N', DEFAULT_DATABASE = [prevencion_cognitiva_mart], CHECK_POLICY = ON;';
END
ELSE
BEGIN
    SET @statement = N'ALTER LOGIN ' + QUOTENAME(@login)
        + N' WITH PASSWORD = ' + QUOTENAME(@password, '''')
        + N', DEFAULT_DATABASE = [prevencion_cognitiva_mart], CHECK_POLICY = ON; ALTER LOGIN '
        + QUOTENAME(@login) + N' ENABLE;';
END;
EXEC sys.sp_executesql @statement;

USE [prevencion_cognitiva_mart];
GO
DECLARE @login sysname = N'$(BI_DB_USER)';
DECLARE @statement nvarchar(max);
IF DATABASE_PRINCIPAL_ID(@login) IS NULL
BEGIN
    SET @statement = N'CREATE USER ' + QUOTENAME(@login) + N' FOR LOGIN ' + QUOTENAME(@login) + N';';
    EXEC sys.sp_executesql @statement;
END;
SET @statement = N'GRANT SELECT ON SCHEMA::[bi] TO ' + QUOTENAME(@login) + N';';
EXEC sys.sp_executesql @statement;
PRINT N'Login BI y permiso SELECT en el esquema bi configurados.';
