# Imagen one-shot para inicializar las bases del monorepo.
# Incluye los scripts dentro de la imagen para que Dokploy no dependa de
# bind mounts al repositorio (AutoDeploy vuelve a clonar en cada despliegue).
FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

WORKDIR /scripts

COPY bd-sql ./bd-sql
COPY bd-dim-sql ./bd-dim-sql
COPY deploy/init.sh ./init.sh
COPY deploy/bi-login.sql ./bi-login.sql

RUN chmod +x ./init.sh

ENTRYPOINT ["/bin/bash", "/scripts/init.sh"]
