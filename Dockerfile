# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---------- builder: full deps + build ----------
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY static ./static

RUN pnpm build

# ---------- runtime-deps: prod deps only ----------
FROM base AS runtime-deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- runtime: slim production image ----------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 8080

CMD ["node", "dist/main"]

# ---------- migrate: dev deps + sources, for running migrations ----------
FROM builder AS migrate
WORKDIR /app

CMD ["pnpm", "migration:run"]
