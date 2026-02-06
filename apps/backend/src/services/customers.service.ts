/**
 * CustomersService - Cross-Platform Identity Management
 * 
 * Handles unified customer profiles across Instagram, Facebook, WhatsApp, and TikTok.
 * Provides normalization logic to map cross-platform leads back to their source.
 */

import { db } from '../db/index.js';
import { customers, posts, offerings, Customer } from '@allinbox/db';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { PlatformType } from './platform.service.js';

export interface UserIdentifier {
    platform: PlatformType;
    username?: string;     // For IG, TikTok
    userId?: string;       // For FB (numeric ID)
    phone?: string;        // For WhatsApp
    displayName?: string;
}

export interface SourceMatchResult {
    sourceChannel?: PlatformType;
    sourcePostId?: string;
    offeringId?: string;
    confidence: number;  // 0-100
}

export class CustomersService {
    /**
     * Find or create a user profile for cross-channel identity tracking.
     * Will attempt to merge if existing profile found on different platform.
     */
    /**
     * Find or create a user profile for cross-channel identity tracking.
     * Will attempt to merge if existing profile found on different platform.
     * Uses a retry mechanism to handle race conditions during concurrent creation.
     */
    static async findOrCreate(
        tenantId: string,
        identifier: UserIdentifier
    ): Promise<{ profile: Customer; isNew: boolean }> {
        const { platform, username, userId, phone, displayName } = identifier;

        let retries = 0;
        const MAX_RETRIES = 2;

        while (retries <= MAX_RETRIES) {
            try {
                // Build query conditions based on platform
                const conditions = [];

                if (platform === 'INSTAGRAM') {
                    // PRIORITIZE Stable ID
                    if (userId) conditions.push(eq(customers.instagramUserId, userId));
                    // Check legacy username match (for backfill)
                    if (username) conditions.push(eq(customers.instagramUsername, username));
                } else if (platform === 'FACEBOOK' && userId) {
                    conditions.push(eq(customers.facebookUserId, userId));
                } else if (platform === 'WHATSAPP' && phone) {
                    conditions.push(eq(customers.whatsappPhone, phone));
                } else if (platform === 'TIKTOK' && username) {
                    conditions.push(eq(customers.tiktokUsername, username));
                }

                // REMOVED: Name-based merging is too risky (User Feedback)
                // We only merge on Strong Identifiers (Phone, Handle, Email)

                // Try to find existing profile
                if (conditions.length > 0) {
                    const existing = await db.select()
                        .from(customers)
                        .where(and(
                            eq(customers.tenantId, tenantId),
                            or(...conditions)
                        ))
                        .limit(1);

                    if (existing.length > 0) {
                        // Update with new platform info if not already set
                        const profile = existing[0];
                        const updates: Partial<typeof customers.$inferInsert> = {};
                        let needsUpdate = false;

                        // INSTAGRAM LOGIC (Auto-Repair Username Changes)
                        if (platform === 'INSTAGRAM') {
                            // 1. Backfill ID if missing (Critical for stability)
                            if (userId && !profile.instagramUserId) {
                                updates.instagramUserId = userId;
                                needsUpdate = true;
                            }
                            // 2. Update Username if changed (User renamed themselves)
                            if (username && profile.instagramUsername !== username) {
                                updates.instagramUsername = username;
                                needsUpdate = true;
                            }
                        }

                        if (platform === 'FACEBOOK' && userId && !profile.facebookUserId) {
                            updates.facebookUserId = userId;
                            needsUpdate = true;
                        }
                        if (platform === 'WHATSAPP' && phone && !profile.whatsappPhone) {
                            updates.whatsappPhone = phone;
                            needsUpdate = true;
                        }
                        if (platform === 'TIKTOK' && username && !profile.tiktokUsername) {
                            updates.tiktokUsername = username;
                            needsUpdate = true;
                        }
                        if (displayName && !profile.displayName) {
                            updates.displayName = displayName;
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            updates.updatedAt = new Date();
                            await db.update(customers)
                                .set(updates)
                                .where(eq(customers.id, profile.id));

                            console.log(`📎 Merged/Updated ${platform} identity for profile: ${profile.id}`);
                        }

                        return { profile: { ...profile, ...updates } as Customer, isNew: false };
                    }
                }

                // Create new profile
                const [newProfile] = await db.insert(customers)
                    .values({
                        tenantId,
                        displayName: displayName || username || phone || 'Unknown',
                        instagramUsername: platform === 'INSTAGRAM' ? username : null,
                        instagramUserId: platform === 'INSTAGRAM' ? userId : null, // Store stable ID
                        facebookUserId: platform === 'FACEBOOK' ? userId : null,
                        whatsappPhone: platform === 'WHATSAPP' ? phone : null,
                        tiktokUsername: platform === 'TIKTOK' ? username : null,
                        totalLeadScore: 0,
                        totalInteractions: 0,
                        status: 'COLD',
                    })
                    .returning();

                console.log(`✨ Created new user profile: ${newProfile.id} (${platform}: ${username || userId || phone})`);
                return { profile: newProfile, isNew: true };

            } catch (err: any) {
                // Check if error is due to unique constraint violation (Race Condition)
                // Postgres code 23505 is unique_violation
                if (err.code === '23505' && retries < MAX_RETRIES) {
                    console.warn(`[CustomersService] Race condition detected, retrying findOrCreate... attempt ${retries + 1}`);
                    retries++;
                    // Short random delay to reduce contention
                    await new Promise(res => setTimeout(res, Math.random() * 100));
                    continue;
                }
                throw err;
            }
        }

        throw new Error('Failed to create customer after retries');
    }

    /**
     * Increment interaction count and update last interaction time
     */
    static async recordInteraction(
        customerId: string,
        intent?: string
    ): Promise<void> {
        await db.update(customers)
            .set({
                totalInteractions: sql`${customers.totalInteractions} + 1` as any,
                lastInteractionAt: new Date(),
                lastIntent: intent || undefined,
                updatedAt: new Date(),
            })
            .where(eq(customers.id, customerId));
    }

    /**
     * Match a post reference text (from WhatsApp DM) to actual posts/offerings
     * 
     * Example: "I saw your floral dress post" → matches post with "floral dress" in caption
     */
    static async matchPostReference(
        tenantId: string,
        referenceText: string
    ): Promise<SourceMatchResult> {
        if (!referenceText || referenceText.length < 3) {
            return { confidence: 0 };
        }

        // 1. REMOVED: Fuzzy Post Caption Search
        // Audit: This causes high false positives (e.g. matching "price" to random posts).
        // We now only match explicitly linked Offerings/Keywords.


        const searchTerm = `%${referenceText.toLowerCase()}%`;

        // 2. Search in offering keywords and names
        const matchingOfferings = await db.select({
            id: offerings.id,
            postId: offerings.postId,
            name: offerings.name,
        })
            .from(offerings)
            .where(and(
                eq(offerings.tenantId, tenantId),
                or(
                    ilike(offerings.name, searchTerm),
                    sql`${referenceText} = ANY(${offerings.keywords})`
                )
            ))
            .limit(3);

        if (matchingOfferings.length > 0) {
            const bestMatch = matchingOfferings[0];

            // Get source post if linked
            let sourceChannel: PlatformType | undefined;
            if (bestMatch.postId) {
                const [post] = await db.select({ platform: posts.platform })
                    .from(posts)
                    .where(eq(posts.id, bestMatch.postId))
                    .limit(1);
                sourceChannel = post?.platform as PlatformType;
            }

            return {
                sourceChannel,
                sourcePostId: bestMatch.postId || undefined,
                offeringId: bestMatch.id,
                confidence: 75,
            };
        }

        return { confidence: 0 };
    }

    /**
     * Update lead score for a profile
     */
    static async updateScore(
        customerId: string,
        scoreChange: number,
        newStatus?: 'COLD' | 'WARM' | 'HOT' | 'CONVERTED'
    ): Promise<void> {
        const updates: Partial<typeof customers.$inferInsert> = {
            totalLeadScore: sql`${customers.totalLeadScore} + ${scoreChange}` as any,
            updatedAt: new Date(),
        };

        if (newStatus) {
            updates.status = newStatus;
        }

        await db.update(customers)
            .set(updates)
            .where(eq(customers.id, customerId));
    }

    /**
     * Get all linked accounts for a user profile
     */
    static async getLinkedAccounts(customerId: string): Promise<{
        instagram?: string;
        facebook?: string;
        whatsapp?: string;
        tiktok?: string;
    }> {
        const [profile] = await db.select({
            instagram: customers.instagramUsername,
            facebook: customers.facebookUserId,
            whatsapp: customers.whatsappPhone,
            tiktok: customers.tiktokUsername,
        })
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);

        return {
            instagram: profile?.instagram || undefined,
            facebook: profile?.facebook || undefined,
            whatsapp: profile?.whatsapp || undefined,
            tiktok: profile?.tiktok || undefined,
        };
    }
}

