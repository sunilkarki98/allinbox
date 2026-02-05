import { ingestionWorker } from '../workers/ingestion.worker.js';
import { analysisWorker } from '../workers/analysis.worker.js';
import { addIngestionJob } from '../workers/queue.js';
import { db } from '../db/index.js';
import { tenants, connectedAccounts, leads } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function verifyFullFlow() {
    console.log('--- Starting Full Flow Verification ---');

    try {
        // 1. Setup Data
        const [tenant] = await db.insert(tenants).values({
            email: `full_test_${Date.now()}@test.com`,
            passwordHash: 'hash',
        }).returning();

        const [account] = await db.insert(connectedAccounts).values({
            tenantId: tenant.id,
            platform: 'INSTAGRAM',
            platformUserId: `ig_${Date.now()}`,
            accessToken: 'token',
        }).returning();

        // 2. Start Workers
        ingestionWorker.run();
        analysisWorker.run();
        console.log('Workers started.');

        // 3. Add Job
        let leadFound = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!leadFound && attempts < maxAttempts) {
            attempts++;
            console.log(`Attempt ${attempts}: Adding ingestion job...`);
            await addIngestionJob(account.id);

            // 4. Wait for processing (Poll DB)
            console.log('Waiting for workers to process...');
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const leadResults = await db.select().from(leads).where(eq(leads.tenantId, tenant.id));
                if (leadResults.length > 0) {
                    const lead = leadResults[0];
                    console.log('✅ Lead Found:', {
                        username: lead.platformUsername,
                        score: lead.leadScore,
                        status: lead.status,
                        interactions: lead.interactionCount
                    });
                    leadFound = true;
                    break;
                }
                process.stdout.write('.');
            }
            console.log('');
        }

        if (leadFound) {
            console.log('SUCCESS: Full flow verified!');
        } else {
            console.warn('FAILURE: No leads found after multiple attempts. Mock data might be consistently empty or worker failing.');
            process.exit(1);
        }

    } catch (err: any) {
        console.error('Verification failed:', err.message);
        process.exit(1);
    } finally {
        await ingestionWorker.close();
        await analysisWorker.close();
        process.exit(0);
    }
}

verifyFullFlow();
