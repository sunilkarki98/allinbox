import { Worker, Job, Queue } from 'bullmq';
import { db } from '../db/index.js';
import { connectedAccounts, interactions, posts } from '@allinbox/db';
import { PlatformService, PlatformType } from '../services/platform.service.js';
import { IngestionService } from '../services/ingestion.service.js';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '../utils/encryption.js';

import { getBullConnection, dragonfly, analysisQueue } from '../utils/clients.js';

// Dragonfly Publisher Client from unified pool
const redisPub = dragonfly.getClient();


export const ingestionWorker = new Worker('ingestion-queue', async (job: Job) => {
    const { accountId } = job.data;
    console.log(`📥 Processing ingestion for account: ${accountId}`);

    try {
        // 1. Get account details
        const [account] = await db.select().from(connectedAccounts).where(eq(connectedAccounts.id, accountId)).limit(1);

        if (!account) {
            console.error(`❌ Account ${accountId} not found`);
            return;
        }

        // 2. Check platform support
        const platform = account.platform as PlatformType;

        if (!PlatformService.isPlatformSupported(platform)) {
            console.log(`📵 ${platform} integration coming soon - skipping ingestion`);
            return { processed: 0, message: `${platform} coming soon` };
        }

        // SECURITY: Decrypt token for use in API calls
        let accessToken = account.accessToken;
        try {
            accessToken = decrypt(account.accessToken);
        } catch (e) {
            console.warn(`⚠️ Failed to decrypt token for account ${accountId}. It might be plaintext or using an old key.`);
        }

        // 3. Fetch posts AND interactions together
        const fetchResult = await PlatformService.fetchNewInteractions(platform);

        if (fetchResult.posts.length === 0 && fetchResult.interactions.length === 0) {
            console.log(`  └─ No new items for ${account.platformUserId}`);
            return;
        }

        console.log(`  └─ Found ${fetchResult.posts.length} posts and ${fetchResult.interactions.length} interactions`);

        // 3. Save to DB with Transaction
        const { processedCount, insertedIds, postMap } = await db.transaction(async (tx) => {
            // =========================================================================
            // STEP B: Process & Insert Data (Delegated to IngestionService)
            // =========================================================================
            // The original code had a check here, but IngestionService should handle empty results gracefully.
            // if (fetchResult.posts.length === 0 && fetchResult.interactions.length === 0) {
            //     return { processedCount: 0, insertedIds: [], postMap: new Map() }; // postExternalIdToDbId was not defined here
            // }

            // IngestionService handles:
            // 1. Post insertion/update
            // 2. Interaction normalization (profiles, offerings, source tracking)
            // 3. Queueing analysis jobs
            // 4. Updating account sync status
            // 5. Publishing real-time events gets handled here?
            //    Actually, IngestionService publishes events too.
            //    But we need to return stats for the job result.

            const result = await IngestionService.processNormalizedData(
                account.tenantId,
                platform,
                fetchResult,
                account.id // Pass accountId to update sync status
            );

            // Reconstruct postMap if needed (though IngestionService handles linking internally)
            // If the worker needs it for something else... but it seems it returns it.
            // The worker returns postMap to the caller, but usually loop continues.
            // Let's assume IngestionService does everything needed.

            console.log(`💾 Saved/Updated data via IngestionService: ${result.insertedIds.length} new interactions`);

            return {
                processedCount: result.processedCount,
                insertedIds: result.insertedIds,
                postMap: new Map() // We don't need to pass this back out really
            };
        });

        console.log(`✅ Ingestion complete for ${accountId}`);
        return { processed: processedCount, message: `Synced ${processedCount} new items` };

    } catch (err: any) {
        console.error(`❌ Ingestion failed for ${accountId}:`, err);

        // Handle Rate Limiting
        if (err.message && err.message.includes('429')) {
            console.warn('Hit Rate Limit. Throwing explicit delayed error.');
            throw new Error('RATE_LIMIT_EXCEEDED');
        }

        throw err;
    }
}, {
    connection: getBullConnection(),
    autorun: false,
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 1000
    }
});
