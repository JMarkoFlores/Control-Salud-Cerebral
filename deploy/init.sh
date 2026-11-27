#!/usr/bin/env bash
# Inicialización de las dos bases del monorepo.
#
# Modos:
#   INIT_MODE=oltp  Crea/verifica la base transaccional y, si corresponde, carga el seed.
#   INIT_MODE=mart  Ejecuta el ETL 01-05, crea el login BI y valida el Data Mart.
#   INIT_MODE=all   Ejecuta ambos modos en orden (uso manual).
#
# En Docker Compose se ejecutan dos servicios one-shot: db-init (oltp) y
# db-mart-init (mart). Así la aplicación transaccional no espera al ETL y el
# dashboard BI solo arranca cuando el Data Mart está listo.
set -euo pipefail

trap 'status=$?; echo "[db-init] ERROR: inicialización interrumpida (código $status). No se borraron datos automáticamente; revise el primer error anterior."; exit "$status"' ERR

MODE="${INIT_MODE:-all}"
SQLCMD=/opt/mssql-tools18/bin/sqlcmd
if [ ! -x "$SQLCMD" ]; then
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
fi

# sqlcmd lee la contraseña de esta variable; no se pasa por argv.
export SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}"

run() {
  echo "[db-init] ejecutando $1"
  "$SQLCMD" -S sqlserver -U sa -C -b -I -i "$1"
}

wait_for_sqlserver() {
  echo "[db-init] esperando a sqlserver..."
  until "$SQLCMD" -S sqlserver -U sa -C -b -I -Q "SELECT 1" >/dev/null 2>&1; do
    sleep 3
  done
}

database_exists() {
  local name="$1"
  local result
  result=$("$SQLCMD" -S sqlserver -U sa -C -b -I -h -1 -W \
    -Q "SET NOCOUNT ON; SELECT ISNULL(DB_ID(N'${name}'), 0);" | tr -d '[:space:]')
  [ -n "$result" ] && [ "$result" != "0" ]
}

drop_database() {
  local name="$1"
  "$SQLCMD" -S sqlserver -U sa -C -b -I -Q \
    "IF DB_ID(N'${name}') IS NOT NULL BEGIN ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]; END;"
}

init_oltp() {
  if [ "${RESET_DB:-false}" = "true" ]; then
    echo "[db-init] RESET_DB=true: eliminando OLTP y Data Mart"
    drop_database "prevencion_cognitiva_oltp"
    drop_database "prevencion_cognitiva_mart"
  fi

  if database_exists "prevencion_cognitiva_oltp"; then
    echo "[db-init] OLTP existente: se omite creación"
  else
    run /scripts/bd-sql/bd-transaccional.sql
  fi

  # En modo demostración el seed se ejecuta también sobre una base existente.
  # Es idempotente: sus INSERT usan IF NOT EXISTS / NOT EXISTS.
  if [ "${SEED_DATA:-false}" = "true" ]; then
    echo "[db-init] SEED_DATA=true: ejecutando seed de demostración (idempotente)"
    run /scripts/bd-sql/seed-data.sql
  fi
}

validate_bi_credentials() {
  if [ -z "${BI_DB_USER:-}" ] || [ -z "${BI_DB_PASSWORD:-}" ]; then
    echo "[db-init] BI_DB_USER y BI_DB_PASSWORD son obligatorios para configurar el acceso de lectura BI" >&2
    exit 1
  fi
  if [[ ! "$BI_DB_USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "[db-init] BI_DB_USER solo puede contener letras, números y guion bajo; debe comenzar con letra o guion bajo" >&2
    exit 1
  fi
}

init_mart() {
  validate_bi_credentials

  if [ "${RESET_MART:-false}" = "true" ]; then
    echo "[db-init] RESET_MART=true: eliminando el Data Mart"
    drop_database "prevencion_cognitiva_mart"
  fi

  if ! database_exists "prevencion_cognitiva_oltp"; then
    echo "[db-init] No existe prevencion_cognitiva_oltp; ejecute primero INIT_MODE=oltp." >&2
    exit 1
  fi

  # 01 crea el Data Mart; 02 carga dimensiones y hechos; 03 crea las vistas
  # analíticas; 04 valida la carga; 05 crea los reportes del Data Mart.
  run /scripts/bd-dim-sql/01_Crear_DataMart.sql
  run /scripts/bd-dim-sql/02_ETL.sql
  run /scripts/bd-dim-sql/03_Vistas_Indicadores.sql
  run /scripts/bd-dim-sql/04_Validacion.sql
  run /scripts/bd-dim-sql/05_Reportes_DataMart.sql

  # Escapar comillas simples antes de pasarlo como variable de sqlcmd. El valor
  # nunca se imprime; solo la ruta del script aparece en el log.
  local bi_password_sql
  bi_password_sql=$(printf '%s' "$BI_DB_PASSWORD" | sed "s/'/''/g")
  "$SQLCMD" -S sqlserver -U sa -C -b -I \
    -v "BI_DB_USER=$BI_DB_USER" "BI_DB_PASSWORD=$bi_password_sql" \
    -i /scripts/bi-login.sql
}

case "$MODE" in
  oltp)
    wait_for_sqlserver
    init_oltp
    echo "[db-init] OLTP inicializado"
    ;;
  mart)
    wait_for_sqlserver
    init_mart
    echo "[db-init] Data Mart y acceso BI inicializados"
    ;;
  all)
    wait_for_sqlserver
    init_oltp
    init_mart
    echo "[db-init] OLTP, Data Mart y acceso BI inicializados"
    ;;
  *)
    echo "[db-init] INIT_MODE inválido: $MODE (use oltp, mart o all)" >&2
    exit 1
    ;;
esac
