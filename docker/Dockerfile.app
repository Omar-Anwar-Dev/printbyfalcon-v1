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
  && addgroup -S pbf && adduser -S pbf -G pbf
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder --chown=pbf:pbf /app/public ./public
COPY --from=builder --chown=pbf:pbf /app/.next/standalone ./
COPY --from=builder --chown=pbf:pbf /app/.next/static ./.next/static
COPY --from=builder --chown=pbf:pbf /app/prisma ./prisma
COPY --from=builder --chown=pbf:pbf /app/package.json ./package.json
COPY --from=builder --chown=pbf:pbf /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=pbf:pbf /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Pin Prisma CLI in runtime so `prisma migrate deploy` (and tsx for seed) use
# the exact same version as the schema. Without this, `npx prisma` falls back
# to the npm registry's latest (currently v7) which rejects our v5 schema.
COPY --from=builder --chown=pbf:pbf /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=pbf:pbf /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder --chown=pbf:pbf /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=pbf:pbf /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=pbf:pbf /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
USER pbf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
