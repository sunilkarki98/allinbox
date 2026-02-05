
import { db } from '../db/index.js';
import { interactions, posts } from '@allinbox/db';
import { desc, eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

async function debug() {
    console.log('Debugging Interaction Links...');

    // 1. Get WhatsApp Interaction
    const wa = await db.select()
        .from(interactions)
        .where(eq(interactions.platform, 'WHATSAPP'))
        .limit(1);

    console.log('WA Interaction:', wa[0] ? {
        id: wa[0].id,
        platform: wa[0].platform,
        sourcePostId: wa[0].sourcePostId,
        postId: wa[0].postId
    } : 'None found');

    if (wa[0]?.sourcePostId) {
        // 2. Try the Join manually
        const joined = await db.select({
            postUrl: posts.url,
            postId: posts.id
        })
            .from(interactions)
            .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
            .where(eq(interactions.id, wa[0].id));

        console.log('Joined Result:', joined);
    }

    process.exit(0);
}

debug().catch(console.error);
