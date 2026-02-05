import { Request, Response } from 'express';
import { interactions, customers, tenantStats } from '@allinbox/db';
import { eq, sql, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js'; // Ensure db is imported
import { withTenant } from '../db/context.js';

/**
 * Analytics Controller
 * Provides aggregated statistics for the dashboard
 */

// GET /api/analytics/overview
export const getOverview = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        if (!user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;

        // FAST PATH: Try to get cached stats first
        const [cachedStats] = await db.select().from(tenantStats).where(eq(tenantStats.tenantId, tenantId));

        if (cachedStats) {
            // Check staleness? For now, assume IngestionService keeps it fresh.
            // We just need to fetch Top Leads separately as that is complex ranking.
            const topLeads = await db.select({
                id: customers.id,
                username: customers.displayName,
                platform: sql<string>`'UNIFIED'`,
                score: customers.totalLeadScore,
                lastIntent: customers.lastIntent
            })
                .from(customers)
                .where(eq(customers.tenantId, tenantId))
                .orderBy(desc(customers.totalLeadScore))
                .limit(5);

            res.json({
                total: cachedStats.totalInteractions,
                unanswered: cachedStats.unansweredCount,
                byPlatform: cachedStats.platformCounts,
                byType: cachedStats.typeCounts,
                byIntent: cachedStats.intentCounts,
                topLeads
            });
            return;
        }

        // SLOW PATH (Fallback): Calculate and Cache (for first run / seed)
        // Execute all queries within the secure tenant context
        const result = await withTenant(tenantId, async (tx) => {
            // PERFORMANCE FIX: Execute all queries in parallel instead of sequentially
            return await Promise.all([
                // Total Interactions
                tx.select({ count: count() })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId)),

                // By Platform
                tx.select({
                    platform: interactions.platform,
                    count: count()
                })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.platform),

                // By Type (DM vs Comment)
                tx.select({
                    type: interactions.type,
                    count: count()
                })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.type),

                // By Intent (AI Analyzed)
                tx.select({
                    intent: interactions.aiIntent,
                    count: count()
                })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.aiIntent),

                // Unanswered Count
                tx.select({ count: count() })
                    .from(interactions)
                    .where(sql`${interactions.tenantId} = ${tenantId} AND ${interactions.isReplied} = false`),

                // Top Customers (was Leads)
                tx.select({
                    id: customers.id,
                    username: customers.displayName,
                    platform: sql<string>`'UNIFIED'`, // Virtual column for compatibility
                    score: customers.totalLeadScore,
                    lastIntent: customers.lastIntent
                })
                    .from(customers)
                    .where(eq(customers.tenantId, tenantId))
                    .orderBy(desc(customers.totalLeadScore))
                    .limit(5)
            ]);
        });

        const [
            totalResult,
            byPlatform,
            byType,
            byIntent,
            unansweredResult,
            topLeads
        ] = result;

        const computedPlatform = byPlatform.reduce((acc, item) => {
            acc[item.platform] = item.count;
            return acc;
        }, {} as Record<string, number>);

        const computedType = byType.reduce((acc, item) => {
            acc[item.type] = item.count;
            return acc;
        }, {} as Record<string, number>);

        const computedIntent = byIntent.filter(i => i.intent).reduce((acc, item) => {
            acc[item.intent!] = item.count;
            return acc;
        }, {} as Record<string, number>);

        const computedTotal = totalResult[0]?.count || 0;
        const computedUnanswered = unansweredResult[0]?.count || 0;

        // SELF-HEALING: Populate Cache for next time
        await db.insert(tenantStats).values({
            tenantId,
            totalInteractions: computedTotal,
            totalLeads: 0, // Need customer count query
            unansweredCount: computedUnanswered,
            platformCounts: computedPlatform,
            typeCounts: computedType,
            intentCounts: computedIntent,
            lastUpdatedAt: new Date()
        }).onConflictDoNothing();

        res.json({
            total: computedTotal,
            unanswered: computedUnanswered,
            byPlatform: computedPlatform,
            byType: computedType,
            byIntent: computedIntent,
            topLeads
        });

    } catch (err: any) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};
