import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { customers, interactions } from '@allinbox/db';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        if (!user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;

        // Fetch Customers (Unified Profile)
        const leadList = await db.select({
            id: customers.id,
            username: customers.instagramUsername, // Default/Primary display
            platform: sql<string>`'INSTAGRAM'`, // TODO: dynamic platform
            leadScore: customers.totalLeadScore,
            tags: customers.tags,
            lastIntent: customers.lastIntent,
            lastContactAt: customers.lastInteractionAt,
            createdAt: customers.createdAt,
            // New fields
            displayName: customers.displayName,
            avatarUrl: customers.avatarUrl
        })
            .from(customers)
            .where(eq(customers.tenantId, tenantId))
            .orderBy(desc(customers.lastInteractionAt))
            .limit(100);

        // PERFORMANCE FIX: Single query to get all interaction counts (instead of N+1)
        if (leadList.length === 0) {
            return res.json([]);
        }

        const leadIds = leadList.map(l => l.id);

        // Get counts in a single aggregated query
        const interactionCounts = await db.select({
            customerId: interactions.customerId,
            count: sql<number>`count(*)::int`
        })
            .from(interactions)
            .where(inArray(interactions.customerId, leadIds))
            .groupBy(interactions.customerId);

        // Create O(1) lookup map
        const countMap = new Map(
            interactionCounts.map(c => [c.customerId, c.count])
        );

        // Enhance list without additional queries
        const enhancedList = leadList.map(l => ({
            ...l,
            totalInteractions: countMap.get(l.id) || 0,
            email: undefined,
            phone: undefined
        }));

        res.json(enhancedList);

    } catch (err) {
        console.error('Leads fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
};

export const lookupCustomer = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const { username, platform } = req.query;

        if (!user?.userId || typeof username !== 'string' || typeof platform !== 'string') {
            res.status(400).json({ error: 'Missing parameters' });
            return;
        }

        const tenantId = user.userId;

        // Handle lookup by platform-specific username
        // We need to check which column matches the platform
        let whereClause;
        if (platform === 'INSTAGRAM') {
            whereClause = eq(customers.instagramUsername, username);
        } else if (platform === 'FACEBOOK') {
            // For FB we might need ID or name depending on storage.
            // Assuming username is passed for now, but sensitive to Schema
            whereClause = eq(customers.facebookUserId, username); // FIXME: Variable naming
        } else if (platform === 'WHATSAPP') {
            whereClause = eq(customers.whatsappPhone, username);
        } else {
            whereClause = eq(customers.instagramUsername, username); // Fallback
        }

        const [lead] = await db.select()
            .from(customers)
            .where(and(
                eq(customers.tenantId, tenantId),
                whereClause
            ))
            .limit(1);

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        res.json(lead);
    } catch (err) {
        console.error('Lead lookup error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const id = req.params.id as string;
        const { tags, leadScore } = req.body;

        if (!user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;

        // Input validation
        if (tags !== undefined && !Array.isArray(tags)) {
            return res.status(400).json({ error: 'Tags must be an array' });
        }
        if (leadScore !== undefined && (typeof leadScore !== 'number' || leadScore < 0 || leadScore > 100)) {
            return res.status(400).json({ error: 'Lead score must be a number between 0 and 100' });
        }

        const updates: { updatedAt: Date; tags?: string[]; totalLeadScore?: number } = { updatedAt: new Date() };
        if (tags) updates.tags = tags;
        if (leadScore !== undefined) updates.totalLeadScore = leadScore;

        const [updated] = await db.update(customers)
            .set(updates)
            .where(and(
                eq(customers.id, id),
                eq(customers.tenantId, tenantId)
            ))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json(updated);
    } catch (err) {
        console.error('Lead update error:', err);
        res.status(500).json({ error: 'Update failed' });
    }
};
