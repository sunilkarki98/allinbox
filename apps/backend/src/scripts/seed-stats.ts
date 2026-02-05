
import { db } from '../db/index.js';
import { interactions, tenantStats, tenants } from '@allinbox/db';
import { eq, sql, count } from 'drizzle-orm';

/**
 * SEED STATS
 * Backfills the tenant_stats table for all existing tenants.
 * This runs the "Slow Path" logic once for everyone.
 */
async function main() {
    console.log('🔄 Starting Stats Backfill...');

    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants.`);

    for (const tenant of allTenants) {
        console.log(`Processing Tenant: ${tenant.id} (${tenant.businessName})...`);

        // 1. Calculate Aggregates
        const [totalRes] = await db.select({ count: count() }).from(interactions).where(eq(interactions.tenantId, tenant.id));
        const [unansweredRes] = await db.select({ count: count() }).from(interactions).where(sql`${interactions.tenantId} = ${tenant.id} AND ${interactions.isReplied} = false`);

        const byPlatform = await db.select({
            platform: interactions.platform,
            count: count()
        }).from(interactions).where(eq(interactions.tenantId, tenant.id)).groupBy(interactions.platform);

        const byType = await db.select({
            type: interactions.type,
            count: count()
        }).from(interactions).where(eq(interactions.tenantId, tenant.id)).groupBy(interactions.type);

        const byIntent = await db.select({
            intent: interactions.aiIntent,
            count: count()
        }).from(interactions).where(eq(interactions.tenantId, tenant.id)).groupBy(interactions.aiIntent);

        // 2. Format JSON
        const platformCounts = byPlatform.reduce((acc, item) => ({ ...acc, [item.platform]: item.count }), {});
        const typeCounts = byType.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {});
        const intentCounts = byIntent.reduce((acc, item) => (item.intent ? { ...acc, [item.intent]: item.count } : acc), {});

        // 3. Upsert Stats
        await db.insert(tenantStats).values({
            tenantId: tenant.id,
            totalInteractions: totalRes.count,
            unansweredCount: unansweredRes.count,
            platformCounts,
            typeCounts,
            intentCounts,
            lastUpdatedAt: new Date()
        }).onConflictDoUpdate({
            target: tenantStats.tenantId,
            set: {
                totalInteractions: totalRes.count,
                unansweredCount: unansweredRes.count,
                platformCounts, // Reset to truth
                typeCounts,
                intentCounts,
                lastUpdatedAt: new Date()
            }
        });

        console.log(`✅ Updated ${tenant.id}: ${totalRes.count} interactions.`);
    }

    console.log('🎉 Backfill Complete!');
    process.exit(0);
}

main().catch(console.error);
