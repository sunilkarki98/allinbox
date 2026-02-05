# Production Build & Run for Admin (Next.js Standalone)
# Using Monorepo context

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy root config and packages
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY apps/admin/package.json ./apps/admin/

RUN npm ci -w @allinbox/admin --include-workspace-root

# Copy source code (Granular to preserve cache)
COPY tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

# Build packages first
RUN npm run build -w @allinbox/types
RUN npm run build -w @allinbox/validators
RUN npm run build -w @allinbox/admin

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# COPY standalone output
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

USER node

EXPOSE 3002

# Next.js standalone server
# Note: Next.js standalone server listens on PORT env var, defaults to 3000
ENV PORT=3002
CMD ["node", "apps/admin/server.js"]
