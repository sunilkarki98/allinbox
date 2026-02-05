
import { db } from '../db/index.js';
import { interactions, customers, posts } from '@allinbox/db';
import { eq, desc, and, or, ilike } from 'drizzle-orm';

async function check() {
    // 1. Get the IELTS Post
    const post = await db.query.posts.findFirst({
        where: ilike(posts.caption, '%IELTS%')
    });
    if (!post) {
        console.log('No posts found!');
        process.exit(0);
    }
    const tenantId = post.tenantId;
    const postId = post.id;

    console.log(`Testing with Post ID: ${postId} (${post.caption?.substring(0, 20)}...)`);

    // 2. Run the exact query from getPostLeads
    console.log('Querying interactions...');
    const rawInteractions = await db.select({
        id: interactions.id,
        senderUsername: interactions.senderUsername,
        leadName: customers.displayName, // CHECK THIS
        postId: interactions.postId,
        sourcePostId: interactions.sourcePostId
    })
        .from(interactions)
        .leftJoin(customers, eq(interactions.customerId, customers.id))
        .where(and(
            eq(interactions.tenantId, tenantId),
            or(
                eq(interactions.postId, postId),
                eq(interactions.sourcePostId, postId)
            )
        ))
        .orderBy(desc(interactions.receivedAt));

    console.log(`Found ${rawInteractions.length} interactions.`);
    rawInteractions.forEach(i => {
        console.log(`- Sender: ${i.senderUsername} | LeadName: ${i.leadName || 'NULL'} | ID: ${i.id}`);
    });

    process.exit(0);
}

check().catch(console.error);
