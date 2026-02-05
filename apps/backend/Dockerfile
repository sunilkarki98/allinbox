# Production Build & Run for Backend
# Using Monorepo context

FROM node:20-alpine AS builder
WORKDIR /app

# Copy root config and packages
COPY package*.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN npm ci -w @allinbox/backend --include-workspace-root

# Copy source code
# Copy source code (Granular to preserve cache)
COPY tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Build packages first
RUN npm run build -w @allinbox/types
RUN npm run build -w @allinbox/validators
RUN npm run build -w @allinbox/db
RUN npm run build -w @allinbox/backend

# Prune dev dependencies
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files and pruned node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/validators/dist ./packages/validators/dist
COPY --from=builder /app/packages/validators/package.json ./packages/validators/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

USER node

# Start the backend
CMD ["node", "apps/backend/dist/index.js"]
