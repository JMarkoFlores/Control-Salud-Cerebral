#!/bin/bash
set -e

WORKSPACE_DIR="/opt/cloudbeaver/workspace"
CONFIG_DIR="${WORKSPACE_DIR}/GlobalConfiguration/.dbeaver"
TEMPLATE="/opt/cloudbeaver-template/data-sources.json"

mkdir -p "${CONFIG_DIR}"

# Sembrar la configuracion global solo en el primer arranque.
# Despues CloudBeaver cifra las credenciales en el workspace y la UI puede editar las conexiones.
if [ -f "${TEMPLATE}" ] && [ ! -f "${CONFIG_DIR}/data-sources.json" ]; then
    echo "[CloudBeaver Init] Primer arranque: sembrando data-sources.json con OLTP y Data Mart..."
    [ -n "${MSSQL_SA_PASSWORD}" ] || echo "[CloudBeaver Init] AVISO: MSSQL_SA_PASSWORD vacia; la conexion pedira contrasena."
    while IFS= read -r line; do
        printf '%s\n' "${line//__MSSQL_SA_PASSWORD__/${MSSQL_SA_PASSWORD}}"
    done < "${TEMPLATE}" > "${CONFIG_DIR}/data-sources.json"
fi

chown -R dbeaver:dbeaver "${WORKSPACE_DIR}" 2>/dev/null || true
chmod 600 "${CONFIG_DIR}/data-sources.json" 2>/dev/null || true

exec /opt/cloudbeaver/launch-product.sh "$@"
