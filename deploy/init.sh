#!/usr/bin/env bash
set -euo pipefail
trap 'status=$?; echo "[db-init] ERROR: inicialización interrumpida (código $status). No se borraron datos automáticamente; revise el primer error anterior."; exit "$status"' ERR

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
if [ ! -x "$SQLCMD" ]; then
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
fi

run() {
  echo "[db-init] ejecutando $1"
  "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I -i "$1"
}

echo "[db-init] esperando a sqlserver..."
until "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I -Q "SELECT 1" >/dev/null 2>&1; do
  sleep 3
done

if [ "${RESET_DB:-false}" = "true" ]; then
  echo "[db-init] RESET_DB=true: eliminando bases existentes"
  "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I -Q \
    "IF DB_ID(N'prevencion_cognitiva_oltp') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_oltp] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_oltp]; END; IF DB_ID(N'prevencion_cognitiva_mart') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_mart] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_mart]; END;"
fi

if [ "${RESET_MART:-false}" = "true" ]; then
  echo "[db-init] RESET_MART=true: eliminando el Data Mart"
  "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I -Q \
    "IF DB_ID(N'prevencion_cognitiva_mart') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_mart] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_mart]; END;"
fi

OLTP_EXISTS=$("$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I -h -1 -W \
  -Q "SET NOCOUNT ON; SELECT ISNULL(DB_ID(N'prevencion_cognitiva_oltp'), 0);" | tr -d '[:space:]')

if [ "$OLTP_EXISTS" = "0" ] || [ -z "$OLTP_EXISTS" ]; then
  run /scripts/bd-sql/bd-transaccional.sql
  if [ "${SEED_DATA:-false}" = "true" ]; then
    run /scripts/bd-sql/seed-data.sql
  fi
else
  echo "[db-init] OLTP existente: se omite creacion y seed"
fi

run /scripts/bd-dim-sql/01_Crear_DataMart.sql
run /scripts/bd-dim-sql/02_Vistas_ETL.sql
run /scripts/bd-dim-sql/03_ETL_Dimensiones.sql
run /scripts/bd-dim-sql/04_ETL_Hechos.sql
run /scripts/bd-dim-sql/05_Vistas_Indicadores.sql
run /scripts/bd-dim-sql/06_Validacion.sql
run /scripts/bd-dim-sql/07_Reportes_DataMart.sql

if [ -z "${BI_DB_USER:-}" ] || [ -z "${BI_DB_PASSWORD:-}" ]; then
  echo "[db-init] BI_DB_USER y BI_DB_PASSWORD son obligatorios para configurar el acceso de lectura BI" >&2
  exit 1
fi
if [[ ! "$BI_DB_USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "[db-init] BI_DB_USER solo puede contener letras, números y guion bajo; debe comenzar con letra o guion bajo" >&2
  exit 1
fi

# Escapar comillas simples antes de pasarlo como variable de sqlcmd. El valor
# nunca se imprime; solo la ruta del script aparece en el log.
BI_DB_PASSWORD_SQL=$(printf '%s' "$BI_DB_PASSWORD" | sed "s/'/''/g")
"$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -I \
  -v "BI_DB_USER=$BI_DB_USER" "BI_DB_PASSWORD=$BI_DB_PASSWORD_SQL" \
  -i /scripts/bi-login.sql
unset BI_DB_PASSWORD_SQL

echo "[db-init] bases y acceso de lectura BI inicializados"
