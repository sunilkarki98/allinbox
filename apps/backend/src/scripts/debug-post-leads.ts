
import { db } from '../db/index.js';
import { interactions } from '@allinbox/db';
import { desc, eq, and, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TENANT_ID = 'e9894c8d-ceba-4f37-9690-66a44a66aacd'; // From previous seed
const POST_ID = 'ef554ef3-8e3a-461d-acd4-d6cbcf21c2c3'; // From previous debug

async function debug() {
    console.log('Debugging Post Leads Query...');
    console.log(`Tenant: ${TENANT_ID}`);
    console.log(`Post ID: ${POST_ID}`);

    try {
        const rawInteractions = await db.select({
            id: interactions.id,
            platform: interactions.platform,
            senderUsername: interactions.senderUsername,
            postId: interactions.postId,
            sourcePostId: interactions.sourcePostId
        })
            .from(interactions)
            .where(and(
                eq(interactions.tenantId, TENANT_ID),
                sql`(${interactions.postId} = ${POST_ID} OR ${interactions.sourcePostId} = ${POST_ID})`
            ))
            .orderBy(desc(interactions.receivedAt));

        console.log('Results:', rawInteractions);
        console.log('Count:', rawInteractions.length);
    } catch (err) {
        console.error('Query Failed:', err);
    }

    process.exit(0);
}

debug();
