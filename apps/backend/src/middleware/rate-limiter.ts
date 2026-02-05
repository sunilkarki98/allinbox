// Rate limiters need to be "lazy" or ensure client is connected
// The RedisStore from 'rate-limit-redis' attempts to key/script load immediately if we new it up.
// So we wrap the store creation to happen only when used or ensure client is connected via a wrapper.

// Best approach: Ensure client is connected when `sendCommand` is called, but `RedisStore` constructor calls `loadIncrementScript` (sendCommand) immediately.
// So we must delay the creation of `RedisStore`.

import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { dragonfly } from '../utils/clients.js';
import { Request } from 'express';

const redisClient = dragonfly.getClient();

// IPv6 Normalization Helper
const normalizeIp = (ip: string) => (ip || 'unknown').replace(/^::ffff:/, '');

// Helper to determine key for rate limiting (Tenant ID > User ID > IP)
const keyGenerator = (req: Request): string => {
    const user = (req as any).user;
    if (user && user.tenantId) return `tenant:${user.tenantId}`;
    if (user && user.id) return `user:${user.id}`;
    return normalizeIp(req.ip || '');
};


// Factory to create limiters AFTER connection is ensured
export const createRateLimiters = () => {
    return {
        globalLimiter: rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 1000,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            store: new RedisStore({
                sendCommand: (...args: string[]) => redisClient.sendCommand(args),
                prefix: 'rl:global:'
            }),
            validate: { ip: false, keyGeneratorIpFallback: false },
            keyGenerator: (req) => normalizeIp(req.ip || '')
        }),
        authLimiter: rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 10,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            store: new RedisStore({
                sendCommand: (...args: string[]) => redisClient.sendCommand(args),
                prefix: 'rl:auth:'
            }),
            message: 'Too many login attempts, please try again later.',
            validate: { ip: false, keyGeneratorIpFallback: false },
            keyGenerator: (req) => normalizeIp(req.ip || '')
        }),
        webhookLimiter: rateLimit({
            windowMs: 1 * 60 * 1000,
            limit: 2000,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            store: new RedisStore({
                sendCommand: (...args: string[]) => redisClient.sendCommand(args),
                prefix: 'rl:webhook:'
            }),
            message: 'Webhook rate limit exceeded',
            validate: { ip: false, keyGeneratorIpFallback: false },
            keyGenerator: (req) => normalizeIp(req.ip || '')
        }),
        tenantApiLimiter: rateLimit({
            windowMs: 1 * 60 * 1000,
            limit: 100,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            store: new RedisStore({
                sendCommand: (...args: string[]) => redisClient.sendCommand(args),
                prefix: 'rl:tenant:'
            }),
            validate: { ip: false, keyGeneratorIpFallback: false },
            keyGenerator
        })
    };
};

