
import { db } from '../db/index.js';
import { IngestionService } from '../services/ingestion.service.js';
import { PlatformService, PlatformType } from '../services/platform.service.js';
import { dragonfly } from '../utils/clients.js';
import { tenants, connectedAccounts } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function seedIngestion() {
    console.log('🌱 Starting Ingestion Seed...');

    // 1. Initialize Infrastructure
    await dragonfly.connect();

    try {
        // 2. Get Tenant
        const tenantsList = await db.select().from(tenants).limit(1);
        if (tenantsList.length === 0) {
            console.error('❌ No tenants found. Run basic seed first: npm run seed');
            return;
        }
        const tenant = tenantsList[0];
        console.log(`🏢 Using Tenant: ${tenant.businessName || 'Unnamed'} (${tenant.id})`);

        // 3. Ensure Connected Accounts exist (Create if missing for simulation)
        const platforms: PlatformType[] = ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'];

        for (const platform of platforms) {
            const existing = await db.select()
                .from(connectedAccounts)
                .where(eq(connectedAccounts.platform, platform))
                .limit(1);

            let accountId = existing[0]?.id;

            if (!existing.length) {
                console.log(`   ➕ creating mock ${platform} account connection...`);
                const [newAcc] = await db.insert(connectedAccounts).values({
                    tenantId: tenant.id,
                    platform,
                    platformUserId: `mock_${platform.toLowerCase()}_${Date.now()}`,
                    accessToken: 'mock_token',
                    platformUsername: `Mock ${platform} User`
                }).returning({ id: connectedAccounts.id });
                accountId = newAcc.id;
            }

            // 4. Generate & Ingest Data
            console.log(`\n📥 Polling ${platform}...`);

            // We use the private mock generator via a public-ish pattern or by temporarily accessing it.
            // Since it's private static, we might need a public wrapper or just reproduce logic.
            // Actually, let's use fetchNewInteractions but force it to return data if possible,
            // or just rely on its internal mock logic which we know exists.

            // The method PlatformService.fetchNewInteractions() handles getting credentials.
            // If creds fail, it falls back to mock data.
            // Let's rely on that behavior since we likely don't have real creds in .env for this local run.

            const result = await PlatformService.fetchNewInteractions(platform);

            if (result.posts.length === 0 && result.interactions.length === 0) {
                console.log(`   - No data generated for ${platform} (Random chance or empty)`);
                continue;
            }

            console.log(`   - Generated: ${result.posts.length} Posts, ${result.interactions.length} Interactions`);

            // 5. Ingest
            const ingestionResult = await IngestionService.processNormalizedData(
                tenant.id,
                platform,
                result,
                accountId
            );

            console.log(`   ✅ Ingested: ${ingestionResult.processedCount} items. (IDs: ${ingestionResult.insertedIds.length})`);
        }

        console.log('\n✨ Ingestion Seed Complete! Check Dashboard.');

    } catch (err) {
        console.error('❌ Seed Failed:', err);
    } finally {
        await dragonfly.quit();
        process.exit(0);
    }
}

seedIngestion();
