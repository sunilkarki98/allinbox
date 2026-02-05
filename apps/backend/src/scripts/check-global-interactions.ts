
import { db } from '../db/index.js';
import { interactions, customers, posts } from '@allinbox/db';
import { eq, desc, and, or, sql } from 'drizzle-orm';

async function check() {
    console.log('--- CHECK GLOBAL INTERACTIONS ---');

    // Get Tenant
    const tenant = await db.query.tenants.findFirst({
        where: eq(customers.email, 'consultancy@allinbox.com')
    });
    // Wait, tenants table doesn't have email lookup easily, use ID from previous knowledge or query
    const tenantId = 'e9894c8d-ceba-4f37-9690-66a44a66aacd'; // From previous step

    const data = await db.select({
        id: interactions.id,
        senderUsername: interactions.senderUsername,
        leadName: customers.displayName, // CHECK THIS
        platform: interactions.platform
    })
        .from(interactions)
        .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
        .leftJoin(customers, eq(interactions.customerId, customers.id))
        .where(eq(interactions.tenantId, tenantId))
        .orderBy(desc(interactions.receivedAt))
        .limit(10);

    console.log(`Found ${data.length} interactions.`);
    data.forEach(i => {
        console.log(`- ${i.senderUsername} | Name: ${i.leadName || 'NULL'} | Platform: ${i.platform}`);
    });

    process.exit(0);
}

check().catch(console.error);
