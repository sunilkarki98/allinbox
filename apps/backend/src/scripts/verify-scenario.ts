
import { db } from '../db/index.js';
import { interactions, posts } from '@allinbox/db';
import { eq, desc } from 'drizzle-orm';
import { dragonfly } from '../utils/clients.js';

async function verifyScenario() {
    console.log('🔍 Verifying Cross-Channel Link...');
    await dragonfly.connect();

    try {
        // Get the latest WhatsApp interaction
        const [lastWa] = await db.select()
            .from(interactions)
            .where(eq(interactions.platform, 'WHATSAPP'))
            .orderBy(desc(interactions.receivedAt))
            .limit(1);

        if (!lastWa) {
            console.log('❌ No WhatsApp interaction found.');
            return;
        }

        console.log(`\n📄 Interaction: "${lastWa.contentText}"`);
        console.log(`   ID: ${lastWa.id}`);
        console.log(`   Source Channel: ${lastWa.sourceChannel || 'N/A'}`);
        console.log(`   Source Post ID: ${lastWa.sourcePostId || 'N/A'}`);

        if (lastWa.sourcePostId) {
            const [sourcePost] = await db.select()
                .from(posts)
                .where(eq(posts.id, lastWa.sourcePostId));

            if (sourcePost) {
                console.log(`\n✅ LINKED TO POST:`);
                console.log(`   Platform: ${sourcePost.platform}`);
                console.log(`   Caption: "${sourcePost.caption.substring(0, 50)}..."`);
                console.log(`   URL: ${sourcePost.url}`);
            } else {
                console.log('❌ Linked post ID exists but post not found in DB.');
            }
        } else {
            console.log('❌ No source post linked. Matching failed.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await dragonfly.quit();
        process.exit(0);
    }
}

verifyScenario();
