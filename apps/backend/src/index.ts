import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { sql } from 'drizzle-orm';
import { createAdapter } from '@socket.io/redis-adapter';

import authRoutes from './routes/auth.routes.js';
import ingestionRoutes from './routes/ingestion.routes.js';
import interactionsRoutes from './routes/interactions.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import customersRoutes from './routes/customers.routes.js';
import apiKeysRoutes from './routes/api-keys.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import adminRoutes from './routes/admin.routes.js';
import platformsRoutes from './routes/platforms.routes.js';
import { db, closeDbConnection } from './db/index.js';
import { dragonfly } from './utils/clients.js';
import { errorHandler } from './middleware/error.middleware.js';
import { correlationMiddleware, logger } from './utils/logger.js';

dotenv.config({ path: '../../.env' });

const env = {
    PORT: process.env.PORT || 3001,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3000/admin',
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || 'supersecret'
};

const allowedOrigins = [env.FRONTEND_URL, env.ADMIN_URL, 'http://localhost:3000'];

const app = express();
const httpServer = createServer(app);

// ==========================
// SOCKET.IO SETUP
// ==========================
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// ==========================
// REDIS / DRAGONFLY ADAPTER
// ==========================
const pubClient = dragonfly.getClient();       // Publisher
const subClient = pubClient.duplicate();       // Subscriber
await subClient.connect();                     // must connect duplicate
io.adapter(createAdapter(pubClient, subClient));

// ==========================
// CONNECT TO DB & REDIS
// ==========================
await dragonfly.ensureConnection();
logger.info('✅ Dragonfly/Redis Connected');

await db.execute(sql`SELECT 1`);
logger.info('✅ Supabase Database Connected');

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS policy: Not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(correlationMiddleware);

// Logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, { reqId: (req as any).id });
    next();
});

// ==========================
// ROUTES
// ==========================
app.use('/api/auth', authRoutes);
app.use('/api/ingest', ingestionRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/platforms', platformsRoutes);

// Health Check
app.get('/api/health', async (req: Request, res: Response) => {
    const health = { status: 'ok', db: 'unknown', dragonfly: 'connected' };
    try {
        await db.execute(sql`SELECT 1`);
        health.db = 'connected';
    } catch (e) {
        health.status = 'degraded';
        health.db = 'disconnected';
    }
    res.json(health);
});

// Error Handler
app.use(errorHandler);

// ==========================
// SOCKET.IO AUTH & CONNECTION
// ==========================
io.use((socket, next) => {
    try {
        const authHeader = socket.handshake.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const sbToken = cookieHeader.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1];
                const legacyToken = cookieHeader.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                token = sbToken || legacyToken;
            }
        }

        if (!token) return next(new Error('Authentication error: No token'));
        const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub: string; email?: string };
        socket.data.tenantId = decoded.sub;
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
    socket.join(`tenant:${tenantId}`);

    socket.on('disconnect', () => {
        logger.info(`🔌 Tenant disconnected`, { tenantId });
    });
});

// ==========================
// START SERVER
// ==========================
httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Backend running on port ${env.PORT}`);
    logger.info(`Frontend allowed origins: ${allowedOrigins.join(', ')}`);
});

// ==========================
// GRACEFUL SHUTDOWN
// ==========================
const gracefulShutdown = async () => {
    logger.info('Received shutdown signal...');
    try {
        await dragonfly.quit();
        await closeDbConnection();
    } catch (e) {
        logger.error('Error during shutdown:', { error: e });
    }
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
