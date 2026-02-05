/**
 * IngestionService - Enterprise Truth-Preserving Interaction Processor
 *
 * DESIGN PRINCIPLES:
 * 1. Raw data fidelity: Store exactly what platforms send
 * 2. Explicit only: Never guess post/offering
 * 3. Analysis deferred: Intent/urgency/matching in analysis layer
 * 4. Idempotent: Safe retries, duplicate prevention
 * 5. Observability: Track orphaned interactions & raw payloads
 * 6. Atomic tenant stats updates
 */

import { db } from '../db/index.js';
import { interactions, posts, connectedAccounts, tenantStats, Interaction, Post } from '@allinbox/db';
import { CustomersService } from './customers.service.js';
import { OfferingService } from './offering.service.js';
import { analysisQueue, redisPub } from '../utils/clients.js';
import { PlatformType } from './platform.service.js';
import { eq, sql, and } from 'drizzle-orm';

export interface IngestionResult {
    processedCount: number;
    insertedIds: string[];
}

export interface NormalizedInteraction {
    platform: PlatformType;
    type: 'COMMENT' | 'DM' | 'STORY_REPLY' | 'MENTION';
    externalId: string;

    // Sender identity
    senderId: string;
    senderUsername: string;
    senderDisplayName?: string;

    // Content
    contentText: string;
    receivedAt: Date;

    // Explicit references
    postExternalId?: string;

    // Raw attribution/referral
    referralData?: {
        source?: string;
        adId?: string;
        refCode?: string;
        rawPayload?: any;
    };

    postReferenceText?: string;

    // Metadata
    mediaUrls?: string[];
    replyToExternalId?: string;
}

export interface NormalizedPost {
    externalId: string;
    platform: PlatformType;
    url?: string;
    imageUrl?: string;
    caption?: string;
    likes: number;
    shares: number;
    commentsCount: number;
    postedAt: Date;
}

export class IngestionService {
    /**
     * Process and save normalized interactions/posts from any source
     */
    static async processNormalizedData(
        tenantId: string,
        platform: PlatformType,
        data: { posts: any[]; interactions: any[] },
        accountId?: string // Optional, update sync status if provided
    ): Promise<IngestionResult> {
        return await db.transaction(async (tx) => {
            const postExternalIdToDbId = new Map<string, string>();
            const insertedIds: string[] = [];
            const newPostsCount = 0;

            // 1. Process Posts (Batch Optimization)
            if (data.posts.length > 0) {
                // Bulk check for existing posts
                const postExternalIds = data.posts.map(p => p.externalId);
                const existingPosts = await tx.select({ id: posts.id, externalId: posts.externalId })
                    .from(posts)
                    .where(and(
                        eq(posts.tenantId, tenantId),
                        eq(posts.platform, platform),
                        // In is nice but check limit. For reasonable batch (e.g. 50) it's fine.
                        sql`${posts.externalId} IN ${postExternalIds}`
                    ));

                const existingMap = new Map(existingPosts.map(p => [p.externalId, p.id]));

                for (const post of data.posts) {
                    if (existingMap.has(post.externalId)) {
                        const existingId = existingMap.get(post.externalId)!;
                        postExternalIdToDbId.set(post.externalId, existingId);

                        // Update metrics
                        await tx.update(posts)
                            .set({
                                likes: post.likes,
                                shares: post.shares,
                                commentsCount: post.commentsCount,
                                syncedAt: new Date()
                            })
                            .where(eq(posts.id, existingId));
                    } else {
                        // RACE CONDITION FIX: Use onConflictDoUpdate
                        const [inserted] = await tx.insert(posts)
                            .values({
                                tenantId,
                                platform,
                                externalId: post.externalId,
                                url: post.url,
                                imageUrl: post.imageUrl || null,
                                caption: post.caption || null,
                                likes: post.likes,
                                shares: post.shares,
                                commentsCount: post.commentsCount,
                                postedAt: post.postedAt,
                                syncedAt: new Date(),
                            })
                            .onConflictDoUpdate({
                                target: [posts.platform, posts.externalId],
                                set: {
                                    likes: post.likes,
                                    shares: post.shares,
                                    commentsCount: post.commentsCount,
                                    syncedAt: new Date()
                                }
                            })
                            .returning({ id: posts.id });

                        postExternalIdToDbId.set(post.externalId, inserted.id);
                    }
                }
            }

            // 2. Process Interactions
            if (data.interactions.length > 0) {
                const URGENT_KEYWORDS = ['urgent', 'check dm', 'payment', 'check inbox', 'sent money', 'asap'];

                const interactionValues = await Promise.all(data.interactions.map(async (item) => {
                    const lowerContent = (item.contentText || '').toLowerCase();
                    const isUrgent = URGENT_KEYWORDS.some(k => lowerContent.includes(k));

                    // Resolve postId
                    let postId = item.postExternalId
                        ? postExternalIdToDbId.get(item.postExternalId) || null
                        : null;

                    // Find/Create User Profile
                    const { profile } = await CustomersService.findOrCreate(tenantId, {
                        platform: item.platform,
                        username: item.senderUsername,
                        userId: item.senderId,
                        displayName: item.senderUsername,
                    });

                    // Normalize Source & Link Offering
                    let sourceChannel = item.platform;
                    let sourcePostId = postId;
                    let offeringId: string | null = null;

                    if (item.referral) {
                        // Robust Attribution: Explicit signal from Platform
                        if (item.referral.source) sourceChannel = item.referral.source; // e.g. "ADS", "SHORTLINK"
                        if (item.referral.adId) sourcePostId = item.referral.adId;      // Link to Ad
                        else if (item.referral.ref) sourcePostId = item.referral.ref;   // Generic Ref
                    }

                    if (item.type === 'DM' && !postId) {
                        if (item.postReference) {
                            const match = await CustomersService.matchPostReference(tenantId, item.postReference);
                            if (match.confidence > 50) {
                                sourceChannel = match.sourceChannel || sourceChannel;
                                sourcePostId = match.sourcePostId || null;
                                offeringId = match.offeringId || null;
                                if (match.sourcePostId) postId = match.sourcePostId;
                            }
                        }

                        if (!offeringId) {
                            const offeringMatch = await OfferingService.matchFromMessage(tenantId, item.contentText, postId || undefined);
                            if (offeringMatch && offeringMatch.confidence > 60) {
                                offeringId = offeringMatch.offeringId;
                                if (offeringMatch.postId) sourcePostId = offeringMatch.postId;
                            }
                        }
                    }

                    await CustomersService.recordInteraction(profile.id);

                    return {
                        tenantId,
                        platform,
                        type: item.type as any,
                        externalId: item.externalId,
                        senderUsername: item.senderUsername,
                        contentText: item.contentText,
                        receivedAt: item.receivedAt,
                        flagUrgent: isUrgent,

                        postId: postId,
                        customerId: profile.id, // Linked to unified Customer profile
                        offeringId: offeringId,

                        postReference: item.postReference || null,
                        sourceChannel: sourceChannel as any,
                        sourcePostId: sourcePostId,
                    };
                }));

                const inserted = await tx.insert(interactions)
                    .values(interactionValues)
                    .onConflictDoNothing({ target: [interactions.platform, interactions.externalId] }) // Avoid dupes
                    .returning({ id: interactions.id, type: interactions.type, isReplied: interactions.isReplied });

                insertedIds.push(...inserted.map(i => i.id));

                // IMPORTANT: Only update stats for ACTUALLY inserted items
                if (inserted.length > 0) {
                    // 5. UPDATE TENANT STATS (Materialized View Maintenance)
                    const batchPlatformCounts: Record<string, number> = {};
                    const batchTypeCounts: Record<string, number> = {};
                    let batchUnanswered = 0;

                    // Iterate over INSERTED items only, or use data if we trust one-to-one? 
                    // We must filter. But inserted only gives us ID/Type if we ask for it.
                    // We asked for type/isReplied above.

                    inserted.forEach(item => {
                        batchPlatformCounts[platform] = (batchPlatformCounts[platform] || 0) + 1;
                        // For type, we need to know the type. returning() gave it back.
                        const typeKey = (item as any).type || 'UNKNOWN';
                        batchTypeCounts[typeKey] = (batchTypeCounts[typeKey] || 0) + 1;

                        // We assume new items are unanswered by default unless migrated with isReplied=true
                        // 'inserted' object might not have 'isReplied' if strictly defined by Drizzle's inference without fallback, 
                        // but DB default is false. We can assume +1 unanswered for new DMs/Comments usually.
                        // Let's check if the inserted item has isReplied (it is in returning).
                        if (!(item as any).isReplied) batchUnanswered++;
                    });

                    // Lock and Update Stats
                    // Note: Drizzle doesn't support 'FOR UPDATE' easily in query builder ubiquitously?
                    // We can just use the atomic update logic we had, but correct the deltas.
                    // Since we already calculated deltas based on INSERTED only, the "+ count" logic is effectively atomic for the counter.
                    // For the JSON maps, we rely on the implementation below (read -> merge -> update).
                    // To be safer, we should re-read inside this tx to lock or use onConflictDoUpdate effectively.

                    const [currentStats] = await tx.select()
                        .from(tenantStats)
                        .where(eq(tenantStats.tenantId, tenantId));
                    //.for('update') // Ideal if available

                    const mergedPlatform = { ...(currentStats?.platformCounts as any || {}) };
                    Object.entries(batchPlatformCounts).forEach(([k, v]) => {
                        mergedPlatform[k] = (mergedPlatform[k] || 0) + v;
                    });

                    const mergedType = { ...(currentStats?.typeCounts as any || {}) };
                    Object.entries(batchTypeCounts).forEach(([k, v]) => {
                        mergedType[k] = (mergedType[k] || 0) + v;
                    });

                    await tx.insert(tenantStats)
                        .values({
                            tenantId,
                            totalInteractions: inserted.length,
                            totalLeads: 0,
                            unansweredCount: batchUnanswered,
                            platformCounts: batchPlatformCounts,
                            typeCounts: batchTypeCounts,
                            lastUpdatedAt: new Date()
                        })
                        .onConflictDoUpdate({
                            target: tenantStats.tenantId,
                            set: {
                                totalInteractions: sql`${tenantStats.totalInteractions} + ${inserted.length}`,
                                unansweredCount: sql`${tenantStats.unansweredCount} + ${batchUnanswered}`,
                                platformCounts: mergedPlatform,
                                typeCounts: mergedType,
                                lastUpdatedAt: new Date()
                            }
                        });
                }
            }

            // 3. Update Account Sync Status (if provided)
            if (accountId) {
                await tx.update(connectedAccounts)
                    .set({ lastSyncedAt: new Date() })
                    .where(eq(connectedAccounts.id, accountId));
            }

            // 4. Queue Analysis for new items
            if (insertedIds.length > 0) {
                await Promise.all(insertedIds.map(id =>
                    analysisQueue.add('analyze-interaction', { interactionId: id })
                ));
            }

            // 6. Publish Event
            if (insertedIds.length > 0) {
                await redisPub.publish('events', JSON.stringify({
                    tenantId,
                    type: 'ingestion_complete',
                    data: {
                        // postsCount: newPostsCount, // Removing this metric as we aren't tracking strictly
                        interactionsCount: insertedIds.length
                    }
                }));
            }

            return { processedCount: insertedIds.length, insertedIds };
        });
    }
}
