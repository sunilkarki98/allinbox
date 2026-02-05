
import { IngestionService } from '../services/ingestion.service.js';
import { db } from '../db/index.js';
import { dragonfly } from '../utils/clients.js';
import { interactions, customers } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function verifyFix() {
    console.log('🧪 Starting Verification...');

    // Connect Redis
    await dragonfly.connect();

    // 0. Fetch a valid Tenant ID
    const tenantsList = await db.query.tenants.findMany({ limit: 1 });
    if (tenantsList.length === 0) {
        console.error('❌ No tenants found in DB. Run seed first.');
        await dragonfly.quit();
        process.exit(1);
    }
    const tenantId = tenantsList[0].id;
    console.log(`ℹ️ Using Tenant ID: ${tenantId}`);

    const platform = 'INSTAGRAM';

    // Simulate a webhook payload (Normalized)
    const mockPayload = {
        posts: [],
        interactions: [{
            platform,
            type: 'DM',
            externalId: `verify_${Date.now()}`,
            senderUsername: 'verification_user',
            senderId: 'verify_user_123',
            contentText: 'I want to buy this!',
            receivedAt: new Date(),
        }]
    };

    console.log('1. Ingesting Mock Interaction...');
    try {
        const result = await IngestionService.processNormalizedData(tenantId, platform, mockPayload);
        console.log('   Ingestion Result:', result);

        if (result.processedCount === 0 || result.insertedIds.length === 0) {
            console.error('❌ Ingestion failed to insert.');
        } else {
            const interactionId = result.insertedIds[0];

            // 2. Verify Database State
            console.log('2. Verifying Database Links...');
            const [interaction] = await db.select()
                .from(interactions)
                .where(eq(interactions.id, interactionId));

            if (!interaction) {
                console.error('❌ Interaction not found in DB.');
            } else {
                if (interaction.customerId) {
                    console.log('✅ Interaction has customerId:', interaction.customerId);

                    const [customer] = await db.select()
                        .from(customers)
                        .where(eq(customers.id, interaction.customerId));

                    if (customer) {
                        console.log('✅ Linked Customer Found:', customer.displayName);
                        console.log('   Lead Score:', customer.totalLeadScore);
                    } else {
                        console.error('❌ Linked Customer NOT found.');
                    }
                } else {
                    console.error('❌ Interaction missing customerId (Fix Failed).');
                }
            }
        }
    } catch (err) {
        console.error('❌ Verification Error:', err);
    } finally {
        await dragonfly.quit();
        process.exit(0);
    }
}

verifyFix();
