import { Worker, Job } from 'bullmq';
import { db } from '../db/index.js';
import { customers, Customer } from '@allinbox/db';
import { ScoringService } from '../services/scoring.service.js';
import { eq, gt, and } from 'drizzle-orm';
import { getBullConnection } from '../utils/clients.js';

const BATCH_SIZE = 1000; // Process in batches to prevent memory exhaustion

/**
 * Cursor-based iterator for memory-safe processing of active customers
 * Yields customers in batches, never loading entire table into memory
 */
async function* getActiveCustomersInBatches(): AsyncGenerator<Customer, void, unknown> {
    let lastId: string | null = null;
    let batchNumber = 0;

    while (true) {
        // Build query - separate operations to avoid circular type inference
        let query = db.select().from(customers);

        // Only decay scores > 0
        if (lastId) {
            query = query.where(and(gt(customers.totalLeadScore, 0), gt(customers.id, lastId))) as typeof query;
        } else {
            query = query.where(gt(customers.totalLeadScore, 0)) as typeof query;
        }

        const batch: Customer[] = await query.orderBy(customers.id).limit(BATCH_SIZE);

        if (batch.length === 0) {
            break;
        }

        batchNumber++;
        console.log(`[Decay Worker] Processing batch ${batchNumber} (${batch.length} active customers)`);

        for (const customer of batch) {
            yield customer;
            lastId = customer.id;
        }
    }
}

export const decayWorker = new Worker('decay-queue', async (job: Job) => {
    console.log('[Decay Worker] Running Global Score Decay...');

    const startTime = Date.now();
    let processed = 0;
    let skipped = 0;

    try {
        for await (const customer of getActiveCustomersInBatches()) {
            const currentScore = customer.totalLeadScore ?? 0;

            const decayedScore = ScoringService.calculateDecayedScore(
                currentScore,
                customer.lastInteractionAt || customer.updatedAt || new Date()
            );

            if (decayedScore !== currentScore) {
                const newStatus = ScoringService.determineStatus(decayedScore);

                await db.update(customers).set({
                    totalLeadScore: decayedScore,
                    status: newStatus,
                    updatedAt: new Date()
                }).where(eq(customers.id, customer.id));

                processed++;
            } else {
                skipped++;
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Decay Worker] Complete. Decayed: ${processed}, Skipped: ${skipped}, Duration: ${duration}s`);

        return { processed, skipped, durationSeconds: parseFloat(duration) };
    } catch (err) {
        console.error('[Decay Worker] Global Decay Failed:', err);
        throw err;
    }
}, {
    connection: getBullConnection(),
    autorun: false,
    concurrency: 1, // Only one decay process at a time
});
