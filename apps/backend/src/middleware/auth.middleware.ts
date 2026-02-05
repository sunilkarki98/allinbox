import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from '../utils/jwt.js';

interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { dragonfly } from '../utils/clients.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies['token'];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; iat: number; exp: number };
        const redis = dragonfly.getClient();

        // 1. Try Cache (Status and Role)
        const cacheKey = `user:identity:${decoded.userId}`;
        let identityStr = await redis.get(cacheKey);
        let identity: { status: string; role: string } | null = null;

        if (identityStr) {
            identity = JSON.parse(identityStr);
        } else {
            // 2. Cache Miss: Hit DB
            const results = await db.select({ status: tenants.status, role: tenants.role })
                .from(tenants)
                .where(eq(tenants.id, decoded.userId))
                .limit(1);

            if (results.length === 0) {
                console.error(`Auth Middleware: User ${decoded.userId} not found in DB.`);
                return res.status(401).json({ error: 'User not found' });
            }

            const user = results[0];

            identity = { status: user.status, role: user.role };
            // Cache for 5 minutes
            await redis.setEx(cacheKey, 300, JSON.stringify(identity));
        }

        if (!identity) {
            return res.status(401).json({ error: 'User identity could not be verified' });
        }

        if (identity.status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Account suspended' });
        }

        // Attach enriched identity to request locals
        res.locals.user = {
            userId: decoded.userId,
            role: identity.role
        };
        next();
    } catch (err) {
        console.error('Auth verification failed:', err);
        return res.status(403).json({ error: 'Invalid token', details: (err as Error).message });
    }
};
