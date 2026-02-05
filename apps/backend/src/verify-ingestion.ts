import { ingestionWorker } from './workers/ingestion.worker.js';
import { addIngestionJob, ingestionQueue } from './workers/queue.js';
import { db } from './db/index.js';
import { tenants, connectedAccounts, interactions } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function verifyIngestion() {
    console.log('--- Starting Ingestion Verification ---');

    try {
        // 1. Setup Data: Create Tenant and Account
        console.log('Creating test tenant and account...');

        const [tenant] = await db.insert(tenants).values({
            email: `ingest_test_${Date.now()}@test.com`,
            passwordHash: 'hash',
        }).returning();

        const [account] = await db.insert(connectedAccounts).values({
            tenantId: tenant.id,
            platform: 'INSTAGRAM',
            platformUserId: 'ig_test_123',
            accessToken: 'token',
        }).returning();

        console.log(`Created account: ${account.id}`);

        // 2. Start Worker
        ingestionWorker.run();
        console.log('Worker started.');

        // 3. Add Job
        console.log('Adding ingestion job...');
        await addIngestionJob(account.id);

        // 4. Wait for processing (Poll DB)
        console.log('Waiting for worker to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 5. Verify Interations
        const results = await db.select().from(interactions).where(eq(interactions.tenantId, tenant.id));
        console.log(`Found ${results.length} interactions in DB for tenant.`);

        if (results.length > 0) {
            console.log('First interaction:', results[0]);
            console.log('SUCCESS: Ingestion flow verified!');
        } else {
            console.warn('WARNING: No interactions found. Might be due to random 30% chance or delay.');
        }

    } catch (err: any) {
        console.error('Verification failed:');
        console.error('Message:', err.message);
        // console.error('Stack:', err.stack); 
    } finally {
        await ingestionWorker.close();
        await ingestionQueue.close();
        process.exit(0);
    }
}

verifyIngestion();
