FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app/dashboard-bi/backend

FROM base AS build
COPY dashboard-bi/backend/package.json dashboard-bi/backend/pnpm-lock.yaml dashboard-bi/backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY dashboard-bi/backend/tsconfig.json ./
COPY dashboard-bi/backend/src ./src
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY dashboard-bi/backend/package.json dashboard-bi/backend/pnpm-lock.yaml dashboard-bi/backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --no-optional
COPY --from=build /app/dashboard-bi/backend/dist ./dist
USER node
EXPOSE 4001
CMD ["node", "dist/server.js"]
