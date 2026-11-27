FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app/dashboard-bi/frontend
COPY dashboard-bi/frontend/package.json dashboard-bi/frontend/pnpm-lock.yaml dashboard-bi/frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY dashboard-bi/frontend/ ./
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN pnpm build

FROM nginx:alpine
COPY dashboard-bi/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dashboard-bi/frontend/dist /usr/share/nginx/html
EXPOSE 80
