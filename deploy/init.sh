#!/usr/bin/env bash
set -euo pipefail

export SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}"
SQLCMD=/opt/mssql-tools18/bin/sqlcmd
if [ ! -x "$SQLCMD" ]; then
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
fi

run() {
  echo "[db-init] ejecutando $1"
  "$SQLCMD" -S sqlserver -U sa -C -b -I -i "$1"
}

echo "[db-init] esperando a sqlserver..."
until "$SQLCMD" -S sqlserver -U sa -C -b -I -Q "SELECT 1" >/dev/null 2>&1; do
  sleep 3
done

if [ "${RESET_DB:-false}" = "true" ]; then
  echo "[db-init] RESET_DB=true: eliminando bases existentes"
  "$SQLCMD" -S sqlserver -U sa -C -b -I -Q \
    "IF DB_ID(N'prevencion_cognitiva_oltp') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_oltp] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_oltp]; END; IF DB_ID(N'prevencion_cognitiva_mart') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_mart] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_mart]; END;"
fi

if [ "${RESET_MART:-false}" = "true" ]; then
  echo "[db-init] RESET_MART=true: eliminando el Data Mart"
  "$SQLCMD" -S sqlserver -U sa -C -b -I -Q \
    "IF DB_ID(N'prevencion_cognitiva_mart') IS NOT NULL BEGIN ALTER DATABASE [prevencion_cognitiva_mart] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [prevencion_cognitiva_mart]; END;"
fi

OLTP_EXISTS=$("$SQLCMD" -S sqlserver -U sa -C -b -I -h -1 -W \
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
run /scripts/bd-dim-sql/02_ETL.sql
run /scripts/bd-dim-sql/03_Vistas_Indicadores.sql
run /scripts/bd-dim-sql/04_Validacion.sql
run /scripts/bd-dim-sql/05_Reportes_DataMart.sql

echo "[db-init] bases inicializadas"
