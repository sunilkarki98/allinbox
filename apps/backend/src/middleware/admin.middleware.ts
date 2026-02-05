import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';

export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, role } = res.locals.user || {};

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Use the role attached by authenticateToken (which is cached and verified)
        if (role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
        }

        next();
    } catch (error) {
        next(error);
    }
};
