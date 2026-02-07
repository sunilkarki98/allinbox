import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { admins } from '@allinbox/db';
import { eq, and } from 'drizzle-orm';

/**
 * Middleware to require admin access.
 * Checks if the authenticated user exists in the separate 'admins' table.
 * Tenants (SaaS customers) do NOT have admin access.
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = res.locals.user || {};

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if this user ID exists in the admins table
        const [admin] = await db.select({ id: admins.id, isActive: admins.isActive })
            .from(admins)
            .where(eq(admins.id, userId))
            .limit(1);

        if (!admin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ error: 'Forbidden: Admin account is deactivated' });
        }

        // Attach admin info to request
        res.locals.isAdmin = true;
        next();
    } catch (error) {
        next(error);
    }
};
