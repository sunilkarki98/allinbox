
import { Worker, Job } from 'bullmq';
import { IngestionService } from '../services/ingestion.service.js';
import { PlatformService, PlatformType } from '../services/platform.service.js';
import { db } from '../db/index.js';
import { connectedAccounts } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { getBullConnection } from '../utils/clients.js';

interface WebhookJobData {
    platform: PlatformType;
    payload: any;
}

export const webhookWorker = new Worker('webhook-queue', async (job: Job<WebhookJobData>) => {
    const { platform, payload } = job.data;
    console.log(`[WebhookWorker] Processing ${platform} event (Job ${job.id})`);

    try {
        // 1. Parse Payload
        const normalizedData = await PlatformService.parseWebhook(platform, payload);

        if (normalizedData.posts.length === 0 && normalizedData.interactions.length === 0) {
            console.log(`[WebhookWorker] No relevant data in webhook (Job ${job.id})`);
            return;
        }

        // 2. Identify Tenant (Receiver ID Logic)
        let platformUserId: string | null = null;

        try {
            if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
                if (payload.entry && payload.entry[0]) {
                    platformUserId = payload.entry[0].id;
                }
            } else if (platform === 'WHATSAPP') {
                if (payload.entry?.[0]?.changes?.[0]?.value?.metadata) {
                    platformUserId = payload.entry[0].changes[0].value.metadata.phone_number_id;
                }
            }
        } catch (e) {
            console.warn(`[WebhookWorker] Failed to extract ID from payload:`, e);
        }

        if (!platformUserId) {
            throw new Error('Could not identify receiver ID from payload'); // Will retry
        }

        // 3. Find Account
        const [account] = await db.select()
            .from(connectedAccounts)
            .where(eq(connectedAccounts.platformUserId, platformUserId))
            .limit(1);

        if (!account) {
            console.warn(`[WebhookWorker] No connected account found for ${platform} ID: ${platformUserId}`);
            return; // Don't retry if account doesn't exist
        }

        // 4. Ingest
        await IngestionService.processNormalizedData(
            account.tenantId,
            platform,
            normalizedData,
            account.id
        );

        console.log(`[WebhookWorker] Successfully processed for Tenant ${account.tenantId}`);

    } catch (err) {
        console.error(`[WebhookWorker] Failed to process webhook job ${job.id}:`, err);
        throw err; // Trigger retry
    }
}, {
    connection: getBullConnection(),
    autorun: false,
    concurrency: 10 // High concurrency for ingestion
});
