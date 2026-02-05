
import { db } from '../db/index.js';
import { posts, interactions } from '@allinbox/db';
import { ilike, or, desc } from 'drizzle-orm';

async function search() {
    console.log('--- SEARCH: "Sneaker" / "50%" ---');

    // 1. Search Posts
    const foundPosts = await db.select().from(posts).where(or(
        ilike(posts.caption, '%sneaker%'),
        ilike(posts.caption, '%shoe%'),
        ilike(posts.caption, '%50%%')
    ));

    console.log(`Found ${foundPosts.length} Matching Posts:`);
    foundPosts.forEach(p => {
        console.log(`[POST] ID: ${p.id} | Platform: ${p.platform}`);
        console.log(`Caption: ${p.caption}`);
        console.log('---');
    });

    // 2. Search Interactions (Explicit Select to avoid lead_id error)
    const foundInteractions = await db.select({
        id: interactions.id,
        senderUsername: interactions.senderUsername,
        contentText: interactions.contentText,
        postId: interactions.postId,
        sourcePostId: interactions.sourcePostId
    }).from(interactions).where(or(
        ilike(interactions.contentText, '%sneaker%'),
        ilike(interactions.contentText, '%shoe%'),
        ilike(interactions.contentText, '%50%%')
    ));

    console.log(`\nFound ${foundInteractions.length} Matching Interactions:`);
    foundInteractions.forEach(i => {
        console.log(`[INT] ID: ${i.id} | Sender: ${i.senderUsername}`);
        console.log(`Text: ${i.contentText}`);
        console.log(`Linked PostID: ${i.postId} | SourcePostID: ${i.sourcePostId}`);
        console.log('---');
    });

    process.exit(0);
}

search().catch(console.error);
