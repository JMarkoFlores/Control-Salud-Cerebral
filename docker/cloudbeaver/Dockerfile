FROM dbeaver/cloudbeaver:latest

USER root

# Plantilla de conexiones preconfiguradas y entrypoint propio
COPY docker/cloudbeaver/data-sources.json /opt/cloudbeaver-template/data-sources.json
COPY docker/cloudbeaver/entrypoint.sh /opt/cloudbeaver-entrypoint.sh

RUN chmod +x /opt/cloudbeaver-entrypoint.sh

ENTRYPOINT ["/opt/cloudbeaver-entrypoint.sh"]
