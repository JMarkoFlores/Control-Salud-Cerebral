FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app/backend

FROM base AS build
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --no-optional
COPY --from=build /app/backend/dist ./dist
COPY bd-dim-sql /app/bd-dim-sql
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
