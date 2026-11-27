#!/usr/bin/env bash
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
if [ ! -x "$SQLCMD" ]; then
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
fi

run() {
  echo "[db-init] ejecutando $1"
  "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -i "$1"
}

echo "[db-init] esperando a sqlserver..."
until "$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "SELECT 1" >/dev/null 2>&1; do
  sleep 3
done

run /scripts/bd-sql/bd-transaccional.sql

if [ "${SEED_DATA:-false}" = "true" ]; then
  run /scripts/bd-sql/seed-data.sql
fi

run /scripts/bd-dim-sql/01_Crear_DataMart.sql
run /scripts/bd-dim-sql/02_Vistas_ETL.sql
run /scripts/bd-dim-sql/03_ETL_Dimensiones.sql
run /scripts/bd-dim-sql/04_ETL_Hechos.sql
run /scripts/bd-dim-sql/05_Vistas_Indicadores.sql
run /scripts/bd-dim-sql/06_Validacion.sql
run /scripts/bd-dim-sql/07_Reportes_DataMart.sql

echo "[db-init] bases inicializadas"
