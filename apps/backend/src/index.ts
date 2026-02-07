import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import ingestionRoutes from './routes/ingestion.routes.js';
import interactionsRoutes from './routes/interactions.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import customersRoutes from './routes/customers.routes.js';
import apiKeysRoutes from './routes/api-keys.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { db } from './db/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { correlationMiddleware, logger } from './utils/logger.js';
import { dragonfly } from './utils/clients.js';

import platformsRoutes from './routes/platforms.routes.js';

import cookieParser from 'cookie-parser';

dotenv.config({ path: '../../.env' });

import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { sql } from 'drizzle-orm';
import { createAdapter } from '@socket.io/redis-adapter';
import { connectRedis } from './utils/redis.js';
const redis = dragonfly.getClient();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

import { env } from './config/env.js';

const PORT = env.PORT;
const allowedOrigins = [env.FRONTEND_URL, env.ADMIN_URL];

// Start Server Wrapper
const startServer = async () => {
    try {
        // 1. Connect to Redis/Dragonfly
        await dragonfly.ensureConnection();
        logger.info('✅ Dragonfly/Redis Connected');

        // 1.5. Connect to Supabase
        await db.execute(sql`SELECT 1`);
        logger.info('✅ Supabase Database Connected');

        // 2. Initialize Rate Limiters (now safe)
        const { globalLimiter, authLimiter, webhookLimiter, tenantApiLimiter } = (await import('./middleware/rate-limiter.js')).createRateLimiters();

        // 3. Setup Socket.io Adapter
        const redisClient = dragonfly.getClient();
        const subClient = redisClient.duplicate();
        await subClient.connect(); // Duplicate needs explicit connect
        io.adapter(createAdapter(redisClient, subClient));

        // 3.5. [REALTIME BRIDGE] Subscribe to Application Events from Redis
        // This subscriber listens to events published by Services (e.g., IngestionService)
        // and forwards them to the specific isolated Tenant Room.
        const appSubscriber = redisClient.duplicate();
        await appSubscriber.connect();

        // 3.6 [SECURITY] Socket.IO Rate Limiting
        const { RateLimiterRedis } = await import('rate-limiter-flexible');
        const socketRateLimiter = new RateLimiterRedis({
            storeClient: dragonfly.getClient(),
            points: 10, // 10 connections
            duration: 1, // per 1 second
            keyPrefix: 'rl:socket:handshake'
        });

        // Apply Rate Limiter BEFORE Auth
        io.use(async (socket, next) => {
            try {
                // Use X-Forwarded-For if available (behind proxy)
                const ip = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || socket.handshake.address;
                await socketRateLimiter.consume(ip);
                next();
            } catch (e) {
                logger.warn('Socket.IO connection rate limited', { ip: (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address });
                next(new Error('Rate limit exceeded'));
            }
        });

        await appSubscriber.subscribe('events', (message) => {
            try {
                const event = JSON.parse(message);
                if (event.tenantId && event.type) {
                    // SECURE FORWARDING: Only emit to the specific tenant room
                    io.to(`tenant:${event.tenantId}`).emit(event.type, event.data);
                    // console.log(`📡 Emitted ${event.type} to tenant:${event.tenantId}`);
                }
            } catch (err) {
                logger.error('Error parsing Redis event:', { error: err });
            }
        });

        // 4. Setup Middleware & Routes
        app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
        app.use(helmet());
        app.use(cookieParser());
        app.use(express.json());
        app.use(correlationMiddleware);

        // Access Logger
        app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, { reqId: (req as any).id });
            next();
        });

        // Apply Limiters
        app.use(globalLimiter);

        // Routes with Specific Limiters
        app.use('/api/auth', authRoutes);
        app.use('/api/ingest', webhookLimiter, ingestionRoutes);
        app.use('/api/webhooks', webhookLimiter, webhooksRoutes);
        app.use('/api/callbacks', webhookLimiter, (await import('./routes/platform-webhooks.routes.js')).default);

        // Tenant APIs
        app.use('/api/interactions', tenantApiLimiter, interactionsRoutes);
        app.use('/api/analytics', tenantApiLimiter, analyticsRoutes);
        app.use('/api/customers', tenantApiLimiter, customersRoutes);
        app.use('/api/keys', tenantApiLimiter, apiKeysRoutes);
        app.use('/api/admin', tenantApiLimiter, adminRoutes);
        app.use('/api/platforms', tenantApiLimiter, platformsRoutes);
        app.use('/api/posts', tenantApiLimiter, (await import('./routes/posts.routes.js')).default);

        // Error Handling
        app.use(errorHandler);

        // Health Check
        app.get('/api/health', async (req: Request, res: Response) => {
            const health = {
                status: 'ok',
                service: 'unified-inbox-backend',
                db: 'unknown',
                dragonfly: 'connected' // We know it's connected if we are here
            };

            try {
                // Check DB
                await db.execute(sql`SELECT 1`);
                health.db = 'connected';
            } catch (e) {
                health.status = 'degraded';
                health.db = 'disconnected';
            }
            res.json(health);
        });

        // Socket Auth & Logic (Tenant Isolation Enforced)
        // IMPORTANT: Uses Supabase JWT verification for consistency with HTTP auth
        io.use((socket, next) => {
            try {
                // Check Authorization header first (preferred), then cookies
                const authHeader = socket.handshake.headers.authorization;
                let token: string | undefined;

                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.split(' ')[1];
                } else {
                    const cookieHeader = socket.handshake.headers.cookie;
                    if (cookieHeader) {
                        // Look for Supabase token cookie or legacy token cookie
                        const sbToken = cookieHeader.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1];
                        const legacyToken = cookieHeader.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                        token = sbToken || legacyToken;
                    }
                }

                if (!token) {
                    return next(new Error('Authentication error: No token'));
                }

                // Verify with Supabase JWT Secret (same as HTTP auth middleware)
                if (!env.SUPABASE_JWT_SECRET) {
                    logger.error('SUPABASE_JWT_SECRET not configured for Socket.io');
                    return next(new Error('Authentication error: Server misconfigured'));
                }

                const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub: string; email?: string };
                socket.data.tenantId = decoded.sub; // Supabase uses 'sub' claim for user ID
                socket.data.email = decoded.email;
                next();
            } catch (err) {
                logger.warn('Socket.io auth failed:', { error: err });
                next(new Error('Authentication error'));
            }
        });

        io.on('connection', (socket) => {
            const tenantId = socket.data.tenantId;
            logger.info(`🔌 Tenant connected`, { tenantId });

            // STRICT ISOLATION: Join ONLY the tenant-specific room
            // Future-proof: If we add staff accounts, they would also join 'tenant:{tenantId}'
            socket.join(`tenant:${tenantId}`);

            socket.on('disconnect', () => logger.info(`🔌 Tenant disconnected`, { tenantId }));
        });

        httpServer.listen(PORT, () => {
            logger.info(`Unified Inbox Backend running on port ${PORT}`, { mode: process.env.NODE_ENV });
            logger.info(`🚀 Server ready at ${env.API_URL}`);
        });

    } catch (e) {
        logger.error('❌ Failed to start server:', { error: e });
        process.exit(1);
    }
};

startServer();


// Graceful shutdown
const gracefulShutdown = async () => {
    logger.info('Received shutdown signal...');
    try {
        await dragonfly.quit();
        logger.info('Dragonfly connection closed');

        const { closeDbConnection } = await import('./db/index.js');
        await closeDbConnection();
    } catch (e) {
        logger.error('Error during shutdown:', { error: e });
    }
    httpServer.close(() => {
        logger.info('Http server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
