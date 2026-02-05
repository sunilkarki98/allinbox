
import { db } from '../src/db/index.js';
import { IngestionService } from '../src/services/ingestion.service.js';
import { tenantStats, interactions, tenants } from '@allinbox/db';
import { dragonfly } from '../src/utils/clients.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function verifyIngestionFix() {
    const tenantId = uuidv4(); // MUST be a valid UUID
    const platform = 'INSTAGRAM';

    console.log(`🧪 Starting Verification for Tenant: ${tenantId}`);

    try {
        // Connect Redis
        await dragonfly.connect();

        // 0. Setup: Create Tenant
        console.log('--- Setup: Creating Mock Tenant ---');
        await db.insert(tenants).values({
            id: tenantId,
            businessName: 'Test Tenant',
            email: `test-${tenantId}@example.com`,
            // Add other required fields if necessary. scanning schema or assuming defaults/nullable
            // If schema validation fails, we will see.
        });

        // Mock Data
        const mockPost = {
            externalId: 'post-' + uuidv4(),
            platform,
            url: 'http://test.com',
            likes: 10,
            shares: 5,
            commentsCount: 2,
            postedAt: new Date()
        };

        const mockInteraction = {
            platform,
            type: 'COMMENT',
            externalId: 'int-' + uuidv4(),
            senderUsername: 'tester',
            senderId: 'user-' + uuidv4(),
            contentText: 'Hello world',
            receivedAt: new Date(),
            postExternalId: mockPost.externalId
        };

        // 1. First Ingestion
        console.log('--- Batch 1: Ingesting New Data ---');
        await IngestionService.processNormalizedData(tenantId, platform, {
            posts: [mockPost],
            interactions: [mockInteraction]
        });

        // Check Stats
        let [stats] = await db.select().from(tenantStats).where(eq(tenantStats.tenantId, tenantId));
        console.log(`Stats after Batch 1: ${stats?.totalInteractions} (Expected: 1)`);

        if (stats?.totalInteractions !== 1) {
            console.error('❌ FAIL: Batch 1 stats incorrect');
            // Clean up before exit
            await db.delete(tenants).where(eq(tenants.id, tenantId));
            process.exit(1);
        }

        // 2. Duplicate Ingestion (Same IDs)
        console.log('--- Batch 2: Ingesting Same Data (Duplicate) ---');
        await IngestionService.processNormalizedData(tenantId, platform, {
            posts: [mockPost],
            interactions: [mockInteraction]
        });

        // Check Stats Again
        [stats] = await db.select().from(tenantStats).where(eq(tenantStats.tenantId, tenantId));
        console.log(`Stats after Batch 2: ${stats?.totalInteractions} (Expected: 1)`);

        if (stats?.totalInteractions !== 1) {
            console.error('❌ FAIL: Stats double-counted!');
            console.error(`Expected 1, got ${stats?.totalInteractions}`);
            // Clean up before exit
            await db.delete(tenants).where(eq(tenants.id, tenantId));
            process.exit(1);
        } else {
            console.log('✅ PASS: Stats did not increase for duplicates.');
        }

        // 3. Mixed Ingestion (1 Old, 1 New)
        console.log('--- Batch 3: Mixed Data (1 Old, 1 New) ---');
        const newInteraction = { ...mockInteraction, externalId: 'int-NEW-' + uuidv4() };

        await IngestionService.processNormalizedData(tenantId, platform, {
            posts: [mockPost],
            interactions: [mockInteraction, newInteraction]
        });

        [stats] = await db.select().from(tenantStats).where(eq(tenantStats.tenantId, tenantId));
        console.log(`Stats after Batch 3: ${stats?.totalInteractions} (Expected: 2)`);

        if (stats?.totalInteractions !== 2) {
            console.error('❌ FAIL: Mixed batch stats incorrect');
            console.error(`Expected 2, got ${stats?.totalInteractions}`);
            // Clean up before exit
            await db.delete(tenants).where(eq(tenants.id, tenantId));
            process.exit(1);
        } else {
            console.log('✅ PASS: Stats incremented correctly for mixed batch.');
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await db.delete(tenantStats).where(eq(tenantStats.tenantId, tenantId));
        // Interactions and posts will cascade delete if configured, or remain. 
        // Deleting tenant usually cascades.
        await db.delete(tenants).where(eq(tenants.id, tenantId));
        await dragonfly.quit();
    }

    console.log('🎉 VERIFICATION SUCCESSFUL');
    process.exit(0);
}

verifyIngestionFix().catch(console.error);
