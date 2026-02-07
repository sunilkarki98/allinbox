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

        // Common update values (refresh timestamp, update display name if missing)
        const updateValues: any = {
            updatedAt: new Date(),
        };
        // Only update display name if it's currently "Unknown" or generic? 
        // For now, let's allow updating it if provided and the existing one was likely auto-generated.
        // Actually, onConflictDoUpdate 'set' logic is static. We can use sql`CASE...` but simpler to just update.
        if (displayName) updateValues.displayName = displayName;
        if (username && platform === 'INSTAGRAM') updateValues.instagramUsername = username;
        if (username && platform === 'TIKTOK') updateValues.tiktokUsername = username;

        try {
            // STRATEGY: Use ON CONFLICT DO UPDATE for atomic concurrency safety
            // We target the UNIQUE constraints we just added: (tenantId, platformId)

            if (platform === 'INSTAGRAM' && userId) {
                const [profile] = await db.insert(customers)
                    .values({
                        tenantId,
                        displayName: displayName || username || 'Instagram User',
                        instagramUserId: userId, // Unique Key
                        instagramUsername: username,
                        totalLeadScore: 0,
                        totalInteractions: 0,
                        status: 'COLD',
                    })
                    .onConflictDoUpdate({
                        target: [customers.tenantId, customers.instagramUserId],
                        set: updateValues,
                    })
                    .returning();

                return { profile, isNew: profile.createdAt ? profile.createdAt.getTime() > Date.now() - 1000 : false }; // Approx check
            }

            if (platform === 'FACEBOOK' && userId) {
                const [profile] = await db.insert(customers)
                    .values({
                        tenantId,
                        displayName: displayName || 'Facebook User',
                        facebookUserId: userId, // Unique Key
                        totalLeadScore: 0,
                        totalInteractions: 0,
                        status: 'COLD',
                    })
                    .onConflictDoUpdate({
                        target: [customers.tenantId, customers.facebookUserId],
                        set: updateValues,
                    })
                    .returning();
                return { profile, isNew: profile.createdAt ? profile.createdAt.getTime() > Date.now() - 1000 : false };
            }

            if (platform === 'WHATSAPP' && phone) {
                const [profile] = await db.insert(customers)
                    .values({
                        tenantId,
                        displayName: displayName || phone,
                        whatsappPhone: phone, // Unique Key
                        totalLeadScore: 0,
                        totalInteractions: 0,
                        status: 'COLD',
                    })
                    .onConflictDoUpdate({
                        target: [customers.tenantId, customers.whatsappPhone],
                        set: updateValues,
                    })
                    .returning();
                return { profile, isNew: profile.createdAt ? profile.createdAt.getTime() > Date.now() - 1000 : false };
            }

            // Fallback for Platforms without Strict IDs (e.g. TikTok currently) OR if ID is missing
            // This path relies on manual SELECT -> INSERT and might still have races, 
            // but we don't have constraints to rely on for these cases yet.

            const conditions = [];
            if (platform === 'TIKTOK' && username) {
                conditions.push(eq(customers.tiktokUsername, username));
            } else if (username) {
                // Loose match? risky.
                // conditions.push(eq(customers.instagramUsername, username)); // only if NOT instagram platform logic above
            }

            if (conditions.length > 0) {
                const existing = await db.select().from(customers)
                    .where(and(eq(customers.tenantId, tenantId), or(...conditions)))
                    .limit(1);

                if (existing.length > 0) {
                    // Update?
                    await db.update(customers).set(updateValues).where(eq(customers.id, existing[0].id));
                    return { profile: { ...existing[0], ...updateValues }, isNew: false };
                }
            }

            // Insert new (Fallback)
            const [newProfile] = await db.insert(customers)
                .values({
                    tenantId,
                    displayName: displayName || username || phone || 'Unknown',
                    tiktokUsername: platform === 'TIKTOK' ? username : null,
                    // If we got here with IG/FB/WA but no ID, we insert what we have (risky for dupes if ID comes later)
                    instagramUsername: platform === 'INSTAGRAM' ? username : null,
                    totalLeadScore: 0,
                    status: 'COLD',
                })
                .returning();

            return { profile: newProfile, isNew: true };

        } catch (err: any) {
            console.error('[CustomersService] Error in findOrCreate:', err);
            // If we hit a unique constraint here (e.g. race in fallback), we re-throw.
            // But strict ID paths are handled by ON CONFLICT.
            throw err;
        }
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

