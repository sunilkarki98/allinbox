import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
    const cookieToken = req.cookies['token'] || req.cookies['sb-access-token'];

    const token = headerToken || cookieToken;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        let decoded: any;

        // 2. Strictly verify with Supabase Secret
        if (!env.SUPABASE_JWT_SECRET) {
            console.error('SUPABASE_JWT_SECRET is not configured. Authentication blocked.');
            return res.status(500).json({ error: 'Identity provider not configured' });
        }

        try {
            decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET);
        } catch (e) {
            console.warn('Supabase JWT verification failed:', e);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        // 3. Extract User ID from Supabase 'sub' claim
        const userId = decoded.sub;

        if (!userId) {
            return res.status(403).json({ error: 'Malformed token: User ID missing' });
        }

        const redis = dragonfly.getClient();

        // 4. Try Cache (Status and Role)
        const cacheKey = `user:identity:${userId}`;
        let identityStr = await redis.get(cacheKey);
        let identity: { status: string; role: string } | null = null;

        if (identityStr) {
            identity = JSON.parse(identityStr);
        } else {
            // 5. Cache Miss: Check Identity

            // A. Check ADMINS table first
            const { admins } = await import('@allinbox/db');
            const [admin] = await db.select({ isActive: admins.isActive })
                .from(admins)
                .where(eq(admins.id, userId))
                .limit(1);

            if (admin) {
                if (!admin.isActive) {
                    return res.status(403).json({ error: 'Admin account is deactivated' });
                }
                identity = { status: 'ACTIVE', role: 'SUPER_ADMIN' };
            } else {
                // B. Check TENANTS table
                const results = await db.select({ status: tenants.status })
                    .from(tenants)
                    .where(eq(tenants.id, userId))
                    .limit(1);

                if (results.length === 0) {
                    // FALLBACK: Sync new tenant
                    console.info(`Auth Middleware: User ${userId} not found in DB. Triggering sync...`);
                    const { AuthService } = await import('../services/auth.service.js');
                    const user = await AuthService.syncUser(userId, decoded.email);

                    if (!user) {
                        return res.status(401).json({ error: 'User registration could not be completed' });
                    }
                    identity = { status: user.status, role: 'CUSTOMER' };
                } else {
                    const user = results[0];
                    identity = { status: user.status, role: 'CUSTOMER' };
                }
            }

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
            userId: userId,
            email: decoded.email,
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
