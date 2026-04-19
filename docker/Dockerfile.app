# Multi-stage build for the Next.js app.
# deps → build → runtime; final image runs as non-root on node:22-alpine.
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl tini \
  # Pin UID/GID so host-side bind mounts (e.g. /var/pbf/storage) can be chown'd
  # to a stable owner — see runbook §1.8 "Storage permissions".
  && addgroup -g 1001 -S pbf && adduser -u 1001 -S pbf -G pbf
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Standalone server (Next.js minimal output) + static assets
COPY --from=builder --chown=pbf:pbf /app/public ./public
COPY --from=builder --chown=pbf:pbf /app/.next/standalone ./
COPY --from=builder --chown=pbf:pbf /app/.next/static ./.next/static
COPY --from=builder --chown=pbf:pbf /app/prisma ./prisma
COPY --from=builder --chown=pbf:pbf /app/package.json ./package.json
# Full node_modules — needed because the runtime command runs `prisma migrate deploy`
# (CLI) and `tsx` for the seed, both of which pull in many transitive deps that
# aren't in Next.js's standalone slim node_modules. Adds ~120MB but unblocks boot.
COPY --from=builder --chown=pbf:pbf /app/node_modules ./node_modules
# Raw TS sources needed by tsx-driven scripts (catalog seeder, prisma seed).
# Without these, `tsx scripts/seed-catalog.ts` errors with ERR_MODULE_NOT_FOUND
# and @/ path aliases (from tsconfig.json) don't resolve.
COPY --from=builder --chown=pbf:pbf /app/scripts ./scripts
COPY --from=builder --chown=pbf:pbf /app/lib ./lib
COPY --from=builder --chown=pbf:pbf /app/tsconfig.json ./tsconfig.json
USER pbf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
