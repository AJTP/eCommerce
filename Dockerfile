# syntax=docker/dockerfile:1

# STRICT_SSL (opcional): pon a "false" para desactivar la verificación TLS al
# instalar dependencias durante el build. Útil en redes con proxy que
# intercepta TLS (p. ej. Netskope) y provoca errores como
# "self-signed certificate in certificate chain". Por defecto "true".
ARG STRICT_SSL=true

FROM node:22-alpine AS base
ARG STRICT_SSL
ENV npm_config_strict_ssl=${STRICT_SSL}
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN set -eu; \
  if [ "$STRICT_SSL" = "false" ]; then export NODE_TLS_REJECT_UNAUTHORIZED=0; fi; \
  pnpm install --frozen-lockfile

# ---- desarrollo: hot-reload con tsx ----
FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# ---- test: corre en un contenedor independiente al de desarrollo ----
FROM base AS test
COPY . .
CMD ["pnpm", "run", "test:ci"]

# ---- build: compila TypeScript a JavaScript ----
FROM base AS build
COPY . .
RUN pnpm run build

# ---- producción: solo dependencias de runtime ----
FROM node:22-alpine AS prod
ARG STRICT_SSL
ENV npm_config_strict_ssl=${STRICT_SSL}
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* ./
RUN set -eu; \
  if [ "$STRICT_SSL" = "false" ]; then export NODE_TLS_REJECT_UNAUTHORIZED=0; fi; \
  pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
