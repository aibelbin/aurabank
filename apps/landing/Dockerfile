# syntax=docker/dockerfile:1
#
# Built from the repository root, because the landing page depends on a
# workspace package and npm needs the whole workspace to install it:
#   docker compose build   (compose sets the context; see compose.yaml)

# ---- build stage: the toolchain lives here and is thrown away ----
FROM node:26-alpine AS build

WORKDIR /repo

# Manifests first, so dependency installation caches independently of source.
# Every workspace manifest is needed for `npm ci` to resolve the tree.
COPY package.json package-lock.json ./
COPY apps/landing/package.json apps/landing/
COPY packages/design/package.json packages/design/
RUN npm ci

COPY . .
RUN npm run build --workspace apps/landing

# ---- runtime stage: Node, the standalone server, and nothing else ----
FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    WAITLIST_DB_PATH=/app/data/waitlist.db

# Standalone output keeps the workspace layout beneath the tracing root, so the
# server lands at apps/landing/server.js with node_modules hoisted alongside.
COPY --from=build /repo/apps/landing/.next/standalone ./
COPY --from=build /repo/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=build /repo/apps/landing/public ./apps/landing/public
# The backup sidecar runs from this same image.
COPY --from=build /repo/apps/landing/scripts/backup-waitlist.mjs ./scripts/backup-waitlist.mjs

# Both directories are mount points. Creating them here with the right owner
# matters: Docker copies an image directory's ownership onto a fresh volume.
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups

USER node

EXPOSE 8080

CMD ["node", "apps/landing/server.js"]
