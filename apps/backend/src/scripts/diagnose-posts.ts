
import { db } from '../db/index.js';
import { posts, interactions, tenants } from '@allinbox/db';
import { eq, sql } from 'drizzle-orm';

async function diagnose() {
    console.log('--- DIAGNOSTIC: Posts & Interacitons (FIXED LOGIC) ---');

    const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.email, 'consultancy@allinbox.com')
    });
    console.log(`Tenant: ${tenant?.id}`);

    const tenantPosts = await db.select({
        id: posts.id,
        caption: posts.caption,
        interactionCount: sql<number>`count(${interactions.id})`
    })
        .from(posts)
        // FIX MATCHES PRODUCTION CONTROLLER: Join on ID or SourceID
        .leftJoin(interactions, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
        .where(eq(posts.tenantId, tenant!.id))
        .groupBy(posts.id)
        .orderBy(posts.id);

    console.log(`\nFound ${tenantPosts.length} posts:`);
    tenantPosts.forEach((p, i) => {
        const caption = p.caption ? p.caption.replace(/\n/g, ' ').substring(0, 30) : 'No Caption';
        console.log(`[${i + 1}] ${caption}... (ID: ${p.id.substring(0, 8)}...) -> Leads: ${p.interactionCount}`);
    });

    process.exit(0);
}

diagnose().catch(console.error);
