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

import { env } from '../config/env.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from Header or Cookie
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies['token'] || req.cookies['sb-access-token']; // Supabase often uses sb-access-token or just access-token

    const token = headerToken || cookieToken;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        let decoded: any;
        let isSupabaseToken = false;

        // 2. Attempt to verify with Supabase Secret first (if configured)
        if (env.SUPABASE_JWT_SECRET) {
            try {
                decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET);
                isSupabaseToken = true;
            } catch (e) {
                // Not a Supabase token, or secret is wrong
            }
        }

        // 3. Fallback to old JWT Secret
        if (!decoded) {
            try {
                decoded = jwt.verify(token, getJWTSecret());
            } catch (e) {
                console.error('Auth verification failed (all secrets tried):', e);
                return res.status(403).json({ error: 'Invalid token' });
            }
        }

        // 4. Extract User ID (Supabase uses 'sub', our custom uses 'userId')
        const userId = decoded.sub || decoded.userId;

        if (!userId) {
            return res.status(403).json({ error: 'Malformed token: User ID missing' });
        }

        const redis = dragonfly.getClient();

        // 5. Try Cache (Status and Role)
        const cacheKey = `user:identity:${userId}`;
        let identityStr = await redis.get(cacheKey);
        let identity: { status: string; role: string } | null = null;

        if (identityStr) {
            identity = JSON.parse(identityStr);
        } else {
            // 6. Cache Miss: Hit DB
            const results = await db.select({ status: tenants.status, role: tenants.role })
                .from(tenants)
                .where(eq(tenants.id, userId))
                .limit(1);

            if (results.length === 0) {
                // If using Supabase, we might need to auto-create the tenant row here 
                // if the trigger hasn't run or we want a fallback.
                console.error(`Auth Middleware: User ${userId} not found in DB.`);
                return res.status(401).json({ error: 'User not found' });
            }

            const user = results[0];
            identity = { status: user.status, role: user.role };
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
            userId: userId,
            email: decoded.email, // Pass email for potential sync
            role: identity.role
        };
        next();
    } catch (err) {
        console.error('Auth middleware critical error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/* OLD AUTH MIDDLEWARE (PRESERVED)
export const authenticateTokenLegacy = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies['token'];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; iat: number; exp: number };
        const redis = dragonfly.getClient();
        const cacheKey = `user:identity:${decoded.userId}`;
        ...
    } catch (err) { ... }
};
*/
