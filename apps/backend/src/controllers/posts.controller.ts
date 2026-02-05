import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { posts, interactions, customers } from '@allinbox/db';
import { eq, desc, and, or, sql } from 'drizzle-orm';

export const getPostsSummary = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        if (!user || !user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;

        // Fetch Posts with Aggregated Metrics
        // We use a raw SQL selection for aggregation because Drizzle's query builder 
        // with complex group-by/aggregation can be verbose.
        // We want: Post Details + Count of Urgent Interactions + Last Activity Time

        const data = await db.select({
            id: posts.id,
            platform: posts.platform,
            imageUrl: posts.imageUrl,
            caption: posts.caption,
            likes: posts.likes,
            shares: posts.shares,
            commentsCount: posts.commentsCount,
            postedAt: posts.postedAt,

            // Aggregated Fields
            urgentCount: sql<number>`count(case when ${interactions.flagUrgent} = true then 1 end)`,
            lastActivity: sql<string>`max(${interactions.receivedAt})`,
            totalInteractions: sql<number>`count(${interactions.id})`
        })
            .from(posts)
            // FIX: Join on EITHER postId OR sourcePostId to include cross-channel interactions in counts
            .leftJoin(interactions, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
            .where(eq(posts.tenantId, tenantId))
            .groupBy(posts.id)
            .orderBy(desc(sql`max(${interactions.receivedAt})`)); // Sort by Most Recent Activity

        // Transform results to match frontend expectations if necessary
        // but passing clean objects is better.

        res.json(data);
    } catch (err: any) {
        console.error('Error fetching posts summary:', err);
        res.status(500).json({ error: 'Failed to fetch posts summary' });
    }
};

export const getPostLeads = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        if (!user || !user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;
        const postId = req.params.id;

        if (!postId) {
            res.status(400).json({ error: 'Post ID is required' });
            return;
        }

        console.log(`[getPostLeads] Fetching for PostID: ${postId} (Tenant: ${tenantId})`);

        // Fetch interactions for this post, grouped by Lead (or senderUsername)
        // We want the latest interaction for each lead on this post

        // Strategy:
        // 1. Fetch all interactions for this post
        // 2. Perform aggregation in SQL or lightweight processing in JS if volume is low per post.
        //    Given filtering by PostId drastically reduces volume, JS processing is acceptable and flexible.

        const rawInteractions = await db.select({
            // Interaction
            id: interactions.id,
            platform: interactions.platform,
            type: interactions.type,
            senderUsername: interactions.senderUsername,
            contentText: interactions.contentText,
            receivedAt: interactions.receivedAt,
            flagUrgent: interactions.flagUrgent,
            isReplied: interactions.isReplied,
            aiIntent: interactions.aiIntent,

            // Lead Data (if linked)
            leadId: customers.id,
            leadName: customers.displayName, // NEW: Prioritize this over senderUsername
            leadScore: customers.totalLeadScore,
            leadTags: customers.tags,
            leadNotes: customers.notes
        })
            .from(interactions)
            .leftJoin(customers, eq(interactions.customerId, customers.id))
            .where(and(
                eq(interactions.tenantId, tenantId),
                or(
                    eq(interactions.postId, postId as string),
                    eq(interactions.sourcePostId, postId as string)
                )
            ))
            .orderBy(desc(interactions.receivedAt));

        // Group by User
        const leadMap = new Map<string, any>();

        for (const i of rawInteractions) {
            const key = i.senderUsername;
            if (!leadMap.has(key)) {
                leadMap.set(key, {
                    ...i,
                    // Aggregate stats
                    interactionCount: 1,
                    urgentCount: i.flagUrgent ? 1 : 0,
                    purchaseIntentCount: i.aiIntent === 'purchase_intent' ? 1 : 0
                });
            } else {
                const existing = leadMap.get(key);
                existing.interactionCount++;
                if (i.flagUrgent) existing.urgentCount++;
                if (i.aiIntent === 'purchase_intent') existing.purchaseIntentCount++;

                // Keep the most urgent flag if any interaction is urgent
                if (i.flagUrgent) existing.flagUrgent = true;
            }
        }

        res.json(Array.from(leadMap.values()));
    } catch (err: any) {
        console.error('Error fetching post leads:', err);
        res.status(500).json({ error: 'Failed to fetch post leads' });
    }
};
