#!/bin/bash
set -e

WORKSPACE_DIR="/opt/cloudbeaver/workspace"
CONFIG_DIR="${WORKSPACE_DIR}/GlobalConfiguration/.dbeaver"
TEMPLATE="/opt/cloudbeaver-template/data-sources.json"

mkdir -p "${CONFIG_DIR}"

# Sembrar la configuracion global con las conexiones a SQL Server (OLTP y Data Mart).
# ponytail: sobrescribe en cada arranque; las conexiones creadas en la UI viven en user-projects.
if [ -f "${TEMPLATE}" ]; then
    echo "[CloudBeaver Init] Sembrando data-sources.json con OLTP y Data Mart..."
    [ -n "${MSSQL_SA_PASSWORD}" ] || echo "[CloudBeaver Init] AVISO: MSSQL_SA_PASSWORD vacia; la conexion pedira contrasena."
    while IFS= read -r line; do
        printf '%s\n' "${line//__MSSQL_SA_PASSWORD__/${MSSQL_SA_PASSWORD}}"
    done < "${TEMPLATE}" > "${CONFIG_DIR}/data-sources.json"
fi

chown -R dbeaver:dbeaver "${WORKSPACE_DIR}" 2>/dev/null || true

exec /opt/cloudbeaver/launch-product.sh "$@"
