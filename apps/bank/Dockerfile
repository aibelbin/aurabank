# syntax=docker/dockerfile:1
#
# Built from the repository root, because the bank depends on a workspace
# package and npm needs the whole workspace to install it:
#   docker compose -f compose.bank.yaml build

# ---- build stage: the toolchain lives here and is thrown away ----
FROM node:26-alpine AS build

WORKDIR /repo

# Manifests first, so dependency installation caches independently of source.
# Every workspace manifest is needed for `npm ci` to resolve the tree.
COPY package.json package-lock.json ./
COPY apps/bank/package.json apps/bank/
COPY apps/landing/package.json apps/landing/
COPY packages/design/package.json packages/design/
RUN npm ci

COPY . .
RUN npm run build --workspace apps/bank

# ---- runtime stage: Node, the standalone server, and nothing else ----
FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    BANK_DB_PATH=/app/data/bank.db \
    BANK_EVIDENCE_DIR=/app/evidence

# Standalone output keeps the workspace layout beneath the tracing root, so the
# server lands at apps/bank/server.js with node_modules hoisted alongside.
COPY --from=build /repo/apps/bank/.next/standalone ./
COPY --from=build /repo/apps/bank/.next/static ./apps/bank/.next/static
COPY --from=build /repo/apps/bank/public ./apps/bank/public
# The backup sidecar and the consistency check run from this same image.
COPY --from=build /repo/apps/bank/scripts/backup-bank.mjs ./scripts/backup-bank.mjs
COPY --from=build /repo/apps/bank/scripts/check-ledger.mjs ./scripts/check-ledger.mjs

# All three are mount points. Creating them here with the right owner matters:
# Docker copies an image directory's ownership onto a fresh volume.
RUN mkdir -p /app/data /app/evidence /app/backups \
 && chown -R node:node /app/data /app/evidence /app/backups

USER node

EXPOSE 8080

CMD ["node", "apps/bank/server.js"]
