
import { db } from '../db/index.js';
import { IngestionService } from '../services/ingestion.service.js';
import { PlatformService, FetchedPost, FetchedInteraction } from '../services/platform.service.js';
import { dragonfly } from '../utils/clients.js';
import { tenants, connectedAccounts, posts } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function seedScenarios() {
    console.log('🌱 Starting Scenario Seeding...');

    // 1. Initialize
    await dragonfly.connect();

    try {
        const tenantsList = await db.select().from(tenants).limit(1);
        if (tenantsList.length === 0) throw new Error('No tenant found');
        const tenantId = tenantsList[0].id;

        // Ensure accounts exist (reuse logic or assume existing from previous seeds)
        // For simplicity, we just need ANY account ID for the ingestion service 
        // (it usually looks up account by platform/tenant, but IngestionService takes accountId optional or we can fetch one)

        const [fbAccount] = await db.select().from(connectedAccounts).where(eq(connectedAccounts.platform, 'FACEBOOK')).limit(1);
        const [igAccount] = await db.select().from(connectedAccounts).where(eq(connectedAccounts.platform, 'INSTAGRAM')).limit(1);
        const [waAccount] = await db.select().from(connectedAccounts).where(eq(connectedAccounts.platform, 'WHATSAPP')).limit(1);

        // ==========================================
        // SCENARIO 1: Simple Facebook Post
        // ==========================================
        console.log('\n--- Scenario 1: Facebook Post ---');
        const fbPostId = `fb_s1_${Date.now()}`;
        const fbPayload = {
            posts: [{
                externalId: fbPostId,
                platform: 'FACEBOOK',
                url: `https://facebook.com/posts/${fbPostId}`,
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
                caption: '🔥 New Facebook Exclusive Deal! 50% Off Sneakers today only.',
                likes: 42,
                shares: 5,
                commentsCount: 2,
                postedAt: new Date()
            } as FetchedPost],
            interactions: [] // Just the post for now, or maybe a comment
        };

        await IngestionService.processNormalizedData(tenantId, 'FACEBOOK', fbPayload, fbAccount?.id);
        console.log('✅ Created Facebook Post');


        // ==========================================
        // SCENARIO 2: IG Post + WhatsApp Button (Cross-Channel)
        // ==========================================
        console.log('\n--- Scenario 2: IG Post + WhatsApp DM ---');

        // 1. Create the Instagram Post (The Source)
        const igUniqueId = `ig_cross_${Date.now()}`;
        const uniqueKeyword = `SUMMERSALE${Math.floor(Math.random() * 1000)}`; // Unique keyword to ensure matching

        const igPayload = {
            posts: [{
                externalId: igUniqueId,
                platform: 'INSTAGRAM',
                url: `https://instagram.com/p/${igUniqueId}`,
                imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400',
                caption: `🌸 Flash Sale! Use code ${uniqueKeyword} for 20% off our Floral Collection. Click WhatsApp button to order!`,
                likes: 156,
                shares: 20,
                commentsCount: 12,
                postedAt: new Date()
            } as FetchedPost],
            interactions: []
        };

        await IngestionService.processNormalizedData(tenantId, 'INSTAGRAM', igPayload, igAccount?.id);
        console.log('✅ Created Instagram Post (Source)');

        // 2. Simulate User clicking "WhatsApp" button on that post
        // The message often pre-fills or they reference it.
        // We will send a WhatsApp message referencing the unique keyword or caption part.

        const waPayload = {
            posts: [],
            interactions: [{
                externalId: `wa_dm_${Date.now()}`,
                platform: 'WHATSAPP',
                type: 'DM',
                senderUsername: `Clicker User`,
                senderId: `wa_user_${Date.now()}`,
                // The magic is here: Reference the keyword or generic content matching the caption
                contentText: `Hi, I saw your post about ${uniqueKeyword} and want to order.`,
                receivedAt: new Date(),
                postReference: uniqueKeyword // Explicit reference helper if available, or just via text
            } as FetchedInteraction]
        };

        // Note: customers.service.ts matchPostReference searches for:
        // 1. Reference text IN keywords/caption
        // So passing the unique keyword as 'postReference' (which platform service might extract) 
        // or just ensuring IngestionService passes it down is key.
        // PlatformService.parseWhatsAppWebhook usually extracts `postReference` from regex.
        // Here we are creating the Normalized Payload directly, so we set postReference directly.

        await IngestionService.processNormalizedData(tenantId, 'WHATSAPP', waPayload, waAccount?.id);
        console.log('✅ Created WhatsApp Message (should look up IG post)');

    } catch (err) {
        console.error('❌ Scenario Seed Failed:', err);
    } finally {
        await dragonfly.quit();
        process.exit(0);
    }
}

seedScenarios();
