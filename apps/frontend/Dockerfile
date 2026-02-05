# Production Build & Run for Frontend (Next.js Standalone)
# Using Monorepo context

FROM node:20-alpine AS builder
WORKDIR /app

# Copy root config and packages
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm ci -w @allinbox/frontend --include-workspace-root

COPY . .

# Build packages first
RUN npm run build -w @allinbox/types
RUN npm run build -w @allinbox/validators
RUN npm run build -w @allinbox/frontend

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER node

EXPOSE 3000

# Next.js standalone server
CMD ["node", "apps/frontend/server.js"]
