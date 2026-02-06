# AllInBox Codebase Guide for AI Agents

## Architecture Overview

**AllInBox** is a SaaS platform for unified inbox management and lead scoring using multi-platform social media integration. The monorepo contains three client apps (frontend, admin, backend) orchestrated with Turbo, connected to a PostgreSQL database, Redis/Dragonfly cache, and BullMQ worker queues.

### Core Structure

```
apps/
  backend/       # Express API + BullMQ workers (Node.js)
  frontend/      # Customer-facing Next.js app
  admin/         # Admin dashboard (Next.js) - SUPER_ADMIN only

packages/
  db/            # Drizzle ORM schema & migrations
  types/         # Shared TypeScript types (zero dependencies)
  validators/    # Zod schemas for request validation
  ai/            # AI client factory (Gemini/Mock providers)
```

### Key Infrastructure

- **Database**: PostgreSQL with Drizzle ORM migrations in `packages/db/drizzle/`
- **Cache**: Dragonfly (Redis-compatible) for session caching, pub/sub, and job queues
- **Job Queues**: BullMQ with separate workers for ingestion, analysis, decay, and webhooks
- **Container Setup**: Docker Compose with Postgres, Dragonfly, and CloudBeaver (DB UI)

## Essential Developer Workflows

### Development Setup

```bash
npm run dev              # Start backend + frontend + admin concurrently
npm run dev:backend     # Backend only (tsx watch)
npm run dev:lite        # Backend + frontend (no admin)
```

### Running Workers

**Important**: Workers should run as separate processes in production, NOT as part of the main server:

```bash
npm run start:worker:ingestion   # Process platform API calls into interactions/posts
npm run start:worker:analysis    # Analyze interactions, calculate scores, detect intent
npm run start:worker:decay       # Decay customer scores daily (cursor-based batching)
npm run start:worker:all         # Combined entry point for resource-constrained environments
```

**Key Files**:
- `apps/backend/src/workers/ingestion.entry.ts` - Ingestion worker entry point
- `apps/backend/src/workers/analysis.entry.ts` - Analysis worker entry point
- `apps/backend/src/workers/decay.entry.ts` - Decay worker entry point (scheduled daily)

### Database Migrations

```bash
npm run build          # Generate Drizzle types
cd packages/db
npx drizzle-kit push  # Apply pending migrations
npx drizzle-kit studio # Open CloudBeaver UI (localhost:8978)
```

### Testing & Verification

```bash
npm run test           # Run all tests across packages
npm run lint           # Lint via ESLint
```

**Verification Scripts**:
- `apps/backend/src/verify-ingestion.ts` - Test ingestion → DB flow
- `apps/backend/src/scripts/verify-full-flow.ts` - Test ingestion → analysis → scoring pipeline

Run with: `tsx apps/backend/src/verify-ingestion.ts`

## Data Flow Architecture

### Ingestion Pipeline

1. **Fetch** (Ingestion Worker) - Pull posts & interactions from platform APIs
2. **Normalize** - Transform platform-specific payloads via `PlatformService.fetchNewInteractions()` → `NormalizedInteraction`
3. **Insert** - `IngestionService.processNormalizedData()` saves to DB, upserts posts, creates customer records
4. **Queue** - Queues interactions for analysis via BullMQ `analysisQueue`

**Key Pattern**: Store raw data first (ingestion layer), analyze asynchronously (analysis layer). Interactions are idempotent via `externalId` deduplication.

### Analysis Pipeline

1. **Worker** reads interaction from DB
2. **AI Analysis** via `AIClient.getInstance()` (Gemini provider or mock)
3. **Intent Detection** - Classifies as `purchase_intent`, `pricing_inquiry`, `spam`, etc.
4. **Scoring** - Updates customer `totalLeadScore` and status (`COLD`/`WARM`/`HOT`) via `ScoringService`
5. **Real-Time Pub/Sub** - Publishes event to Dragonfly: `tenant:{tenantId}:events` with `INTERACTION_ANALYZED` event

### Score Decay

- **Decay Worker** processes customers daily (scheduled via `scheduleGlobalDecay()`)
- Uses **cursor-based batching** (1000 items/batch) to prevent memory exhaustion
- Only decays scores > 0; recalculates based on `lastInteractionAt` timestamp
- Updates status accordingly (e.g., HOT → WARM)

**Implementation**: `apps/backend/src/workers/decay.worker.ts`

## Authentication & Authorization

### JWT + HttpOnly Cookies

- All auth handled via `AuthService.register()` / `.login()`
- JWT stored in **HttpOnly** cookies (secure in prod, lax in dev)
- Validation via `authenticateToken` middleware → Redis cache → DB
- **Admin Routes**: Protected by `isAdminMiddleware` (checks `role === 'SUPER_ADMIN'`)

**Key Files**:
- `apps/backend/src/controllers/auth.controller.ts` - Register/login endpoints
- `apps/backend/src/middleware/auth.middleware.ts` - JWT validation
- `apps/admin/src/context/auth-context.tsx` - Client-side session management

### Frontend/Admin Protection

- **Frontend** (`apps/frontend/src/middleware.ts`): Redirects unauthenticated users to `/login`
- **Admin** (`apps/admin/src/context/auth-context.tsx`): Fetches `/auth/me`, forces logout if role ≠ `SUPER_ADMIN`

## Key Services & Patterns

### IngestionService
- **Location**: `apps/backend/src/services/ingestion.service.ts`
- **Principle**: "Raw data fidelity + explicit only + deferred analysis"
- **Main Method**: `processNormalizedData(tenantId, platform, data)` → Returns `{ processedCount, insertedIds }`
- **Idempotency**: Deduplicates via `externalId` + `platform`; safe for retry

### PlatformService
- **Location**: `apps/backend/src/services/platform.service.ts`
- **Responsibilities**:
  - `fetchNewInteractions()` - Calls real or mock platform APIs
  - `parseWebhook()` - Parses incoming webhook payloads
  - `isPlatformSupported()` - Checks if platform is enabled
- **Platform Types**: `'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'WHATSAPP'`
- **Note**: TikTok/WhatsApp marked "coming soon"

### ScoringService
- **Location**: `apps/backend/src/services/scoring.service.ts`
- **Scoring Algorithm**: Incremental scoring based on interaction type + AI intent
- `updateCustomerScore()` - Weights interactions and updates lead status
- `calculateDecayedScore()` - Time-based decay function
- `determineStatus()` - Maps scores to status (`COLD`/`WARM`/`HOT`)

### AIClient Factory
- **Location**: `packages/ai/src/index.ts`
- **Pattern**: Singleton factory selecting provider at startup
- **Providers**: `GeminiProvider` (prod) or `MockProvider` (dev fallback)
- **Usage**: `AIClient.getInstance().analyzeInteraction(context, text)` → Returns `{ intent, confidence, suggestion }`
- **Env Var**: `GEMINI_API_KEY` required for production

## Configuration & Environment

### Validation
- `apps/backend/src/config/env.ts` uses Zod for strict env validation
- **Required**: `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `REDIS_URL`
- **Optional**: AI keys, OAuth secrets (work in dev without them)
- Load order: Root `.env` → `../../.env` from any package

### Database Schema
- **Location**: `packages/db/src/db/schema.ts`
- **Driver**: Drizzle ORM with PostgreSQL
- **Tables**: `tenants`, `connectedAccounts`, `interactions`, `posts`, `customers`, `leads`, `webhookLogs`, `systemSettings`
- **Types**: Inferred via `@allinbox/types` package

## Monorepo Build System (Turbo)

### Key Commands
```bash
turbo run build              # Build all packages (respects dependency order)
turbo run build:affected     # Build only changed packages + dependents
turbo run lint               # Run eslint across all packages
```

### Turbo Configuration (`turbo.json`)
- **Task Dependencies**: `build` depends on `^build` (upstream dependencies first)
- **Caching**: `.next/`, `dist/` directories cached
- **Env Vars**: `DATABASE_URL`, `NODE_ENV` tracked for cache invalidation
- **Dev Tasks**: `dev` and `clean` have `cache: false`

## Validation Patterns

All API request validation uses **Zod schemas** defined in `packages/validators/src/index.ts`:

```typescript
// Example usage in controllers:
const data = registerSchema.parse(req.body);
// If invalid, Zod throws; caught in error middleware
```

**Key Validators**:
- `registerSchema` - Email + strong password rules
- `loginSchema` - Email + password
- `createApiKeySchema` - Name + scopes
- `updateTenantStatusSchema` - Status enum validation

## Rate Limiting & Security

- **Express Rate Limit**: `express-rate-limit` + Redis backing in `rate-limiter.ts`
- **CORS**: Restricted to `FRONTEND_URL` environment variable
- **Helmet**: Security headers on all responses
- **Token Expiry**: 7 days (configurable in auth controller)

## Real-Time Communication

### Socket.IO Setup
- **Server**: `apps/backend/src/index.ts` (port 3001)
- **Adapter**: `@socket.io/redis-adapter` for multi-process broadcasting
- **Namespace**: Tenants receive events on `tenant:{tenantId}:events` channel
- **Use Case**: Real-time UI updates on interaction analysis, score changes

Example event published by analysis worker:
```javascript
await redisPub.publish(`tenant:${tenantId}:events`, JSON.stringify({
  type: 'INTERACTION_ANALYZED',
  data: { id, aiIntent, aiConfidence, aiSuggestion }
}));
```

## Common Development Tasks

### Adding a New API Endpoint
1. Create route handler in `apps/backend/src/routes/`
2. Add validation schema to `packages/validators/src/index.ts`
3. Create controller method in `apps/backend/src/controllers/`
4. Apply middleware (auth, rate-limit) in route definition
5. Return typed response

### Adding a Database Field
1. Update schema in `packages/db/src/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate`
3. Apply migration: `npx drizzle-kit push`
4. Update `@allinbox/types` if type-aligned

### Debugging Workers
- Worker logs go to console (caught by PM2/Docker logs)
- Dry-run verification scripts exist: `verify-ingestion.ts`, `verify-full-flow.ts`
- Check Dragonfly queue status: `redis-cli XLEN analysis-queue` (if available)

### Adding a New Shared Package
1. Create folder under `packages/newpkg/`
2. Add to root `package.json` workspaces
3. Create `package.json` with `@allinbox/newpkg` name
4. Add reference: `"@allinbox/newpkg": "*"` in dependent `package.json`
5. Run `npm install` to link

## Deployment Notes

- **Multi-Worker Setup**: Run each worker as separate PM2 process or Docker container
- **Database Migrations**: Auto-run at startup or manual via drizzle-kit
- **Redis Persistence**: Dragonfly config includes `--save` for durability
- **Environment**: `.env` must include all required vars; `env.ts` validates at startup
- **Build**: `npm run build` generates `dist/` and `.next/` for all apps

## Gotchas & Important Patterns

1. **Worker Isolation**: Never run all workers in main process (deprecated `worker.ts` warns this)
2. **Cursor-Based Iteration**: Large batch operations use async generators (see `decay.worker.ts`)
3. **Transaction Safety**: Use `db.transaction()` for multi-step operations to prevent inconsistency
4. **Idempotent Ingestion**: Platform integration must deduplicate by `externalId + platform`
5. **Real-Time Events**: Emitted outside DB transactions (after commit succeeds)
6. **Cache Invalidation**: User identity cached in Dragonfly; updated on auth changes

## Important File References

| File | Purpose |
|------|---------|
| `apps/backend/src/index.ts` | Main server entry + Socket.IO setup |
| `apps/backend/src/services/ingestion.service.ts` | Core ingestion logic |
| `apps/backend/src/workers/ingestion.worker.ts` | Async ingestion job processor |
| `apps/backend/src/workers/analysis.worker.ts` | AI analysis & scoring |
| `packages/db/src/db/schema.ts` | Database schema definition |
| `packages/validators/src/index.ts` | Zod request validation schemas |
| `packages/ai/src/index.ts` | AI provider factory |
| `apps/admin/src/context/auth-context.tsx` | Admin session management |
| `turbo.json` | Build orchestration config |

---

**Last Updated**: February 2026
