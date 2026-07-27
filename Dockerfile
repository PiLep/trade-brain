# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ && \
    corepack enable
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build-time placeholders only — override at runtime in the host/compose.
ENV BETTER_AUTH_SECRET="build-time-placeholder-not-used-in-prod"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data /app/public && \
    chown nextjs:nodejs /app/data /app/public

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Rebuild/ensure better-sqlite3 for Alpine after standalone copy (entrypoint migrate).
USER root
RUN apk add --no-cache python3 make g++ && \
    npm install better-sqlite3@12.11.1 --omit=dev && \
    apk del python3 make g++ && \
    chmod +x /app/scripts/entrypoint.sh && \
    chown -R nextjs:nodejs /app/node_modules /app/scripts /app/package.json /app/package-lock.json 2>/dev/null || \
    chown -R nextjs:nodejs /app/node_modules /app/scripts

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
