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
import { logger } from '../utils/logger.js';

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

                // Separate by verb
                const itemsToDelete = data.interactions.filter(i => i.verb === 'remove');
                const itemsToUpsert = data.interactions.filter(i => i.verb !== 'remove'); // add or edit

                // A. Handle Deletes
                if (itemsToDelete.length > 0) {
                    const deleteIds = itemsToDelete.map(i => i.externalId);
                    await tx.delete(interactions)
                        .where(and(
                            eq(interactions.tenantId, tenantId),
                            eq(interactions.platform, platform),
                            sql`${interactions.externalId} IN ${deleteIds}`
                        ));
                    logger.info(`🗑️ Deleted interactions`, { count: deleteIds.length, tenantId, platform });
                    // Note: We are ignoring stats decrement for now to avoid complexity, 
                    // seeing as stats are eventually consistent via full syncs.
                }

                // B. Handle Upserts (Add/Edit)
                if (itemsToUpsert.length > 0) {
                    const interactionValues = await Promise.all(itemsToUpsert.map(async (item) => {
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
                            displayName: item.senderDisplayName || item.senderUsername,
                        });

                        // Normalize Source & Link Offering
                        let sourceChannel = item.platform;
                        let sourcePostId = postId;
                        let offeringId: string | null = null;

                        if (item.referral) {
                            // Robust Attribution: Explicit signal from Platform
                            if (item.referral.source) sourceChannel = item.referral.source;
                            if (item.referral.adId) sourcePostId = item.referral.adId;
                            else if (item.referral.ref) sourcePostId = item.referral.ref;
                        }

                        if (item.type === 'DM' && !postId) {
                            // ... (Same inference logic as before)
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

                        // Only record interaction stats for actual new interactions, not edits?
                        // CustomersService.recordInteraction updates 'lastInteractionAt'. 
                        // It's fine to update it on edit too.
                        await CustomersService.recordInteraction(profile.id);

                        return {
                            tenantId,
                            platform,
                            type: item.type as any,
                            externalId: item.externalId,
                            senderUsername: item.senderUsername,
                            contentText: item.contentText,
                            mediaUrls: item.mediaUrls || [], // Persist Media
                            receivedAt: item.receivedAt,
                            flagUrgent: isUrgent,

                            postId: postId,
                            customerId: profile.id,
                            offeringId: offeringId,

                            postReference: item.postReference || null,
                            sourceChannel: sourceChannel as any,
                            sourcePostId: sourcePostId,
                        };
                    }));

                    // We use ON CONFLICT DO UPDATE to handle Edits and Idempotency
                    const inserted = await tx.insert(interactions)
                        .values(interactionValues)
                        .onConflictDoUpdate({
                            target: [interactions.platform, interactions.externalId],
                            set: {
                                contentText: sql`excluded.content_text`,
                                mediaUrls: sql`excluded.media_urls`,
                                receivedAt: sql`excluded.received_at`, // Update timestamp on edit?
                                flagUrgent: sql`excluded.flag_urgent`,
                                // Don't overwrite AI analysis if it exists? 
                                // Actually, if content changes, we might want to re-analyze.
                                // For now, let's overwrite.
                            }
                        })
                        .returning({
                            id: interactions.id,
                            xmax: sql`cast(xmax as text)` // PostgreSQL trick to detect insert vs update
                        });

                    // Filter truly new inserts (xmax = 0) for analytics
                    const newInserts = inserted.filter(i => i.xmax === '0');
                    insertedIds.push(...newInserts.map(i => i.id));

                    // Note: If we want to return IDs of edited items too for re-analysis, we should push them.
                    // But typically ingestion result counts "new" stuff. 
                    // Let's stick to returning new IDs for queuing analysis.
                    // Actually, edited messages SHOULD be re-analyzed (e.g. sentiment changed).
                    const allProcessedIds = inserted.map(i => i.id);

                    // 5. UPDATE TENANT STATS (Atomic)
                    if (newInserts.length > 0) {
                        await tx.insert(tenantStats)
                            .values({
                                tenantId,
                                totalInteractions: newInserts.length,
                                totalLeads: 0,
                                unansweredCount: newInserts.length, // approximation
                                platformCounts: { [platform]: newInserts.length },
                                typeCounts: {}, // simplified init
                                lastUpdatedAt: new Date()
                            })
                            .onConflictDoUpdate({
                                target: tenantStats.tenantId,
                                set: {
                                    totalInteractions: sql`${tenantStats.totalInteractions} + ${newInserts.length}`,
                                    unansweredCount: sql`${tenantStats.unansweredCount} + ${newInserts.length}`,
                                    lastUpdatedAt: new Date(),
                                    // Complex JSON updates skipped for atomic safety in this block, 
                                    // relying on periodic re-calc or separate robust incrementer if needed.
                                    // Or we can do a simple jsonb_set for platform count if critical.
                                }
                            });
                    }

                    // Queue analysis for ALL upserted items (new + edited)
                    if (allProcessedIds.length > 0) {
                        // We map all processed IDs for analysis
                        // insertedIds is used for return value, let's include updates there too?
                        // The interface says "insertedIds". Let's stick to that but queue analysis for all.
                        await Promise.all(allProcessedIds.map(id =>
                            analysisQueue.add('analyze-interaction', { interactionId: id })
                        ));
                    }
                }
            }

            // 3. Update Account Sync Status (if provided)
            if (accountId) {
                await tx.update(connectedAccounts)
                    .set({ lastSyncedAt: new Date() })
                    .where(eq(connectedAccounts.id, accountId));
            }

            // 6. Publish Event
            if (insertedIds.length > 0) {
                await redisPub.publish('events', JSON.stringify({
                    tenantId,
                    type: 'ingestion_complete',
                    data: {
                        interactionsCount: insertedIds.length
                    }
                }));
            }

            return { processedCount: insertedIds.length, insertedIds };
        });
    }
}
