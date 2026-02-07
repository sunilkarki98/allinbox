
import { Worker, Job } from 'bullmq';
import { db } from '../db/index.js';
import { interactions, tenantStats, tenants } from '@allinbox/db';
import { eq, sql, count } from 'drizzle-orm';
import { getBullConnection } from '../utils/clients.js';
import { logger } from '../utils/logger.js';

export const statsReconcilerWorker = new Worker('stats-reconciler-queue', async (job: Job) => {
    logger.info('[StatsReconciler] Starting nightly reconciliation...');

    try {
        // 1. Get all active tenants
        const allTenants = await db.select({ id: tenants.id }).from(tenants);
        let correctedCount = 0;

        for (const tenant of allTenants) {
            const tenantId = tenant.id;

            // 2. Calculate Real Stats (Parallalized)
            const [
                totalResult,
                unansweredResult,
                byPlatform,
                byType,
                byIntent
            ] = await Promise.all([
                // Total
                db.select({ count: count() }).from(interactions).where(eq(interactions.tenantId, tenantId)),

                // Unanswered
                db.select({ count: count() }).from(interactions)
                    .where(sql`${interactions.tenantId} = ${tenantId} AND ${interactions.isReplied} = false`),

                // By Platform
                db.select({ platform: interactions.platform, count: count() })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.platform),

                // By Type
                db.select({ type: interactions.type, count: count() })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.type),

                // By Intent
                db.select({ intent: interactions.aiIntent, count: count() })
                    .from(interactions)
                    .where(eq(interactions.tenantId, tenantId))
                    .groupBy(interactions.aiIntent),
            ]);

            const realTotal = totalResult[0]?.count || 0;
            const realUnanswered = unansweredResult[0]?.count || 0;

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

            // 3. Upsert Corrected Stats
            await db.insert(tenantStats)
                .values({
                    tenantId,
                    totalInteractions: realTotal,
                    totalLeads: 0, // Placeholder
                    unansweredCount: realUnanswered,
                    platformCounts: computedPlatform,
                    typeCounts: computedType,
                    intentCounts: computedIntent,
                    lastUpdatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: tenantStats.tenantId,
                    set: {
                        totalInteractions: realTotal,
                        unansweredCount: realUnanswered,
                        platformCounts: computedPlatform,
                        typeCounts: computedType,
                        intentCounts: computedIntent,
                        lastUpdatedAt: new Date()
                    }
                });

            correctedCount++;
        }

        logger.info(`[StatsReconciler] Completed reconciliation for ${correctedCount} tenants.`);

    } catch (err) {
        logger.error('[StatsReconciler] Failed reconciliation job', { error: err });
        throw err;
    }
}, {
    connection: getBullConnection(),
    autorun: true // Self-managed worker
});
