import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { interactions, posts, offerings, customers } from '@allinbox/db';
import { eq, desc, and, sql } from 'drizzle-orm';

export const getInteractions = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const platform = req.query.platform as string;

        if (!user || !user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = user.userId;

        // Build conditional where clause
        const filters = [eq(interactions.tenantId, tenantId)];
        if (platform && platform !== 'ALL') {
            filters.push(eq(interactions.platform, platform as any));
        }

        const sortMode = req.query.sort as string;

        // PRIORITY STREAM LOGIC
        if (sortMode === 'PRIORITY') {
            // 1. Fetch High Priority Items (Unreplied Buying/Booking intents)
            // Limit to top 10 to keep it focused
            const highPriority = await db.select({
                id: interactions.id,
                tenantId: interactions.tenantId,
                platform: interactions.platform,
                type: interactions.type,
                externalId: interactions.externalId,
                senderUsername: interactions.senderUsername,
                contentText: interactions.contentText,
                receivedAt: interactions.receivedAt,
                aiIntent: interactions.aiIntent,
                aiConfidence: interactions.aiConfidence,
                aiSuggestion: interactions.aiSuggestion,
                // Explainability Fields
                aiReasoning: interactions.aiReasoning,
                aiModelVersion: interactions.aiModelVersion,
                aiAnalyzedAt: interactions.aiAnalyzedAt,
                flagUrgent: interactions.flagUrgent,
                isReplied: interactions.isReplied,
                replyText: interactions.replyText,
                repliedAt: interactions.repliedAt,
                postId: interactions.postId,
                postReference: interactions.postReference,
                sourcePostId: interactions.sourcePostId,
                sourceChannel: interactions.sourceChannel,
                postImage: posts.imageUrl,
                postCaption: posts.caption,
                postUrl: posts.url,
                postPlatform: posts.platform,
                leadScore: customers.totalLeadScore,
                leadName: customers.displayName,
                leadTags: customers.tags
            })
                .from(interactions)
                .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
                .leftJoin(customers, eq(interactions.customerId, customers.id))
                .where(and(
                    eq(interactions.tenantId, tenantId),
                    eq(interactions.isReplied, false), // Only unreplied
                    // Intent Filter: Buying, Service, Pricing, or Urgent Flag
                    sql`(${interactions.aiIntent} IN ('purchase_intent', 'service_inquiry', 'pricing_inquiry') OR ${interactions.flagUrgent} = true)`
                ))
                .orderBy(desc(interactions.receivedAt))
                .limit(10);

            // 2. Fetch Normal Chronological Stream (Limit 50)
            // We fetch the standard stream as usual
            const normalStream = await db.select({
                id: interactions.id,
                tenantId: interactions.tenantId,
                platform: interactions.platform,
                type: interactions.type,
                externalId: interactions.externalId,
                senderUsername: interactions.senderUsername,
                contentText: interactions.contentText,
                receivedAt: interactions.receivedAt,
                aiIntent: interactions.aiIntent,
                aiConfidence: interactions.aiConfidence,
                aiSuggestion: interactions.aiSuggestion,
                // Explainability Fields
                aiReasoning: interactions.aiReasoning,
                aiModelVersion: interactions.aiModelVersion,
                aiAnalyzedAt: interactions.aiAnalyzedAt,
                flagUrgent: interactions.flagUrgent,
                isReplied: interactions.isReplied,
                replyText: interactions.replyText,
                repliedAt: interactions.repliedAt,
                postId: interactions.postId,
                postReference: interactions.postReference,
                sourcePostId: interactions.sourcePostId,
                sourceChannel: interactions.sourceChannel,
                postImage: posts.imageUrl,
                postCaption: posts.caption,
                postUrl: posts.url,
                postPlatform: posts.platform,
                leadScore: customers.totalLeadScore,
                leadName: customers.displayName,
                leadTags: customers.tags
            })
                .from(interactions)
                .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
                .leftJoin(customers, eq(interactions.customerId, customers.id))
                .where(and(...filters))
                .orderBy(desc(interactions.receivedAt))
                .limit(limit)
                .offset(offset);

            // 3. Merge Strategies
            // Create a Map to deduplicate by ID
            const mergedMap = new Map<string, any>();

            // Add High Priority first (preserving order)
            highPriority.forEach((item) => mergedMap.set(item.id, item));

            // Add Normal Stream (only if not already present)
            normalStream.forEach((item) => {
                if (!mergedMap.has(item.id)) {
                    mergedMap.set(item.id, item);
                }
            });

            const data = Array.from(mergedMap.values());

            // Get total count (approximation is fine for hybrid view, or real count of filters)
            const countResult = await db.select({ count: sql<number>`count(*)` })
                .from(interactions)
                .where(and(...filters));

            res.json({
                data,
                total: countResult[0]?.count || 0,
                limit,
                offset
            });
            return;
        }

        // DEFAULT LOGIC (Time-based for Post View / Filter View)
        const data = await db.select({
            id: interactions.id,
            tenantId: interactions.tenantId,
            platform: interactions.platform,
            type: interactions.type,
            externalId: interactions.externalId,
            senderUsername: interactions.senderUsername,
            contentText: interactions.contentText,
            receivedAt: interactions.receivedAt,
            aiIntent: interactions.aiIntent,
            aiConfidence: interactions.aiConfidence,
            aiSuggestion: interactions.aiSuggestion,
            // Explainability Fields
            aiReasoning: interactions.aiReasoning,
            aiModelVersion: interactions.aiModelVersion,
            aiAnalyzedAt: interactions.aiAnalyzedAt,
            flagUrgent: interactions.flagUrgent,
            isReplied: interactions.isReplied,
            replyText: interactions.replyText,
            repliedAt: interactions.repliedAt,

            // Post linkage
            postId: interactions.postId,
            postReference: interactions.postReference,
            sourcePostId: interactions.sourcePostId, // NEW
            sourceChannel: interactions.sourceChannel, // NEW

            // Enriched Post Data (optional for list, but helpful)
            postImage: posts.imageUrl,
            postCaption: posts.caption,
            postUrl: posts.url, // NEW: Needed for frontend grouping
            postPlatform: posts.platform, // NEW: Correctly identify Post origin for grouping

            // Enriched Lead Data (mapped from Customer)
            leadScore: customers.totalLeadScore,
            leadName: customers.displayName, // NEW: Needed for global identity display
            leadTags: customers.tags
        })
            .from(interactions)
            // Fix: Link to post via direct ID OR source attribution (for Cross-Channel)
            .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
            .leftJoin(customers, eq(interactions.customerId, customers.id))
            .where(and(...filters))
            .orderBy(desc(interactions.receivedAt))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination UI
        const countResult = await db.select({
            count: sql<number>`count(*)`
        })
            .from(interactions)
            .where(and(...filters));

        res.json({
            data,
            total: countResult[0]?.count || 0,
            limit,
            offset
        });
    } catch (err: any) {
        console.error('Error fetching interactions:', err);
        res.status(500).json({ error: 'Failed' });
    }
};


export const getInteractionsByLead = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const { username } = req.params;

        if (!user || !user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!username) {
            res.status(400).json({ error: 'Username is required' });
            return;
        }

        const data = await db.select({
            id: interactions.id,
            platform: interactions.platform,
            type: interactions.type,
            senderUsername: interactions.senderUsername,
            contentText: interactions.contentText,
            receivedAt: interactions.receivedAt,
            flagUrgent: interactions.flagUrgent,
            isReplied: interactions.isReplied,
            replyText: interactions.replyText,
            repliedAt: interactions.repliedAt,
            postId: interactions.postId,
            sourcePostId: interactions.sourcePostId, // NEW
            sourceChannel: interactions.sourceChannel, // NEW
            // Post Data
            postUrl: posts.url,
            postPlatform: posts.platform, // NEW
            postImage: posts.imageUrl, // Kept unique
            postCaption: posts.caption,

            aiIntent: interactions.aiIntent,
            aiSuggestion: interactions.aiSuggestion,
            // Explainability Fields
            aiReasoning: interactions.aiReasoning,
            aiModelVersion: interactions.aiModelVersion,
            aiAnalyzedAt: interactions.aiAnalyzedAt
        })
            .from(interactions)
            .leftJoin(posts, sql`${posts.id} = COALESCE(${interactions.postId}, ${interactions.sourcePostId})`)
            .where(and(
                eq(interactions.tenantId, user.userId),
                sql`lower(${interactions.senderUsername}) = lower(${username as string})`
            ))
            .orderBy(desc(interactions.receivedAt));

        res.json(data);
    } catch (err: any) {
        console.error('Error fetching user interactions:', err);
        res.status(500).json({ error: 'Failed' });
    }
};
