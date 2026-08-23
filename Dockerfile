# syntax=docker/dockerfile:1

# ---- build stage: the toolchain lives here and is thrown away ----
FROM node:26-alpine AS build

WORKDIR /app

# Manifests first, so dependency installation caches independently of source.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage: Node, the standalone server, and nothing else ----
FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    WAITLIST_DB_PATH=/app/data/waitlist.db

# `output: "standalone"` emits server.js plus only the node_modules it reaches.
# Static assets and public/ are not included in it and must be copied across.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# The waitlist database is the only state this app has, and it lives on a
# volume. Creating the directory here with the right owner matters: Docker
# copies an image directory's ownership onto a fresh named volume, and without
# it the unprivileged user could not write the database.
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 8080

CMD ["node", "server.js"]
