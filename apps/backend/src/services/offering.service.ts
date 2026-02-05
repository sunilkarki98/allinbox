/**
 * OfferingService - Product/Service Matching
 * 
 * Handles matching customer messages to offerings using keywords,
 * post context, and AI-detected references.
 */

import { db } from '../db/index.js';
import { offerings, posts, Offering } from '@allinbox/db';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

export interface OfferingMatch {
    offeringId: string;
    offeringName: string;
    offeringType: 'PRODUCT' | 'SERVICE';
    postId?: string;
    confidence: number;
}

export class OfferingService {
    /**
     * Match a message to the most relevant offering.
     * Uses keyword matching, post context, and fuzzy text search.
     */
    static async matchFromMessage(
        tenantId: string,
        messageText: string,
        postId?: string
    ): Promise<OfferingMatch | null> {
        const lowerMessage = messageText.toLowerCase();

        // 1. If postId provided, check if there's an offering linked to that post
        if (postId) {
            const [linkedOffering] = await db.select({
                id: offerings.id,
                name: offerings.name,
                type: offerings.type,
                postId: offerings.postId,
            })
                .from(offerings)
                .where(and(
                    eq(offerings.tenantId, tenantId),
                    eq(offerings.postId, postId)
                ))
                .limit(1);

            if (linkedOffering) {
                return {
                    offeringId: linkedOffering.id,
                    offeringName: linkedOffering.name,
                    offeringType: linkedOffering.type,
                    postId: linkedOffering.postId || undefined,
                    confidence: 95, // High confidence - directly linked
                };
            }
        }

        // 2. Search offerings by keyword array match
        const keywordMatches = await db.select({
            id: offerings.id,
            name: offerings.name,
            type: offerings.type,
            postId: offerings.postId,
            keywords: offerings.keywords,
        })
            .from(offerings)
            .where(eq(offerings.tenantId, tenantId))
            .limit(50);

        // Score each offering by keyword matches
        const scored: { offering: typeof keywordMatches[0]; score: number }[] = [];

        for (const offering of keywordMatches) {
            let score = 0;

            // Check keywords
            if (offering.keywords) {
                for (const keyword of offering.keywords) {
                    if (lowerMessage.includes(keyword.toLowerCase())) {
                        score += 20;
                    }
                }
            }

            // Check name match
            if (lowerMessage.includes(offering.name.toLowerCase())) {
                score += 30;
            }

            // Check for partial name match (each word)
            const nameWords = offering.name.toLowerCase().split(/\s+/);
            for (const word of nameWords) {
                if (word.length > 3 && lowerMessage.includes(word)) {
                    score += 10;
                }
            }

            if (score > 0) {
                scored.push({ offering, score });
            }
        }

        // Sort by score and return best match
        scored.sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score >= 20) {
            const best = scored[0];
            return {
                offeringId: best.offering.id,
                offeringName: best.offering.name,
                offeringType: best.offering.type,
                postId: best.offering.postId || undefined,
                confidence: Math.min(90, best.score),
            };
        }

        // 3. Fuzzy search by name (fallback)
        const fuzzyMatches = await db.select({
            id: offerings.id,
            name: offerings.name,
            type: offerings.type,
            postId: offerings.postId,
        })
            .from(offerings)
            .where(and(
                eq(offerings.tenantId, tenantId),
                ilike(offerings.name, `%${extractKeywords(lowerMessage).join('%')}%`)
            ))
            .limit(1);

        if (fuzzyMatches.length > 0) {
            return {
                offeringId: fuzzyMatches[0].id,
                offeringName: fuzzyMatches[0].name,
                offeringType: fuzzyMatches[0].type,
                postId: fuzzyMatches[0].postId || undefined,
                confidence: 50,
            };
        }

        return null;
    }

    /**
     * Get all offerings for a tenant with optional type filter
     */
    static async getByTenant(
        tenantId: string,
        type?: 'PRODUCT' | 'SERVICE'
    ): Promise<Offering[]> {
        const conditions = [eq(offerings.tenantId, tenantId)];

        if (type) {
            conditions.push(eq(offerings.type, type));
        }

        return db.select()
            .from(offerings)
            .where(and(...conditions));
    }

    /**
     * Create or update offering keywords based on post caption
     */
    static async syncKeywordsFromPost(
        offeringId: string,
        postCaption: string
    ): Promise<void> {
        const keywords = extractKeywords(postCaption);

        if (keywords.length > 0) {
            await db.update(offerings)
                .set({
                    keywords,
                    updatedAt: new Date(),
                })
                .where(eq(offerings.id, offeringId));
        }
    }
}

/**
 * Extract significant keywords from text for matching
 */
function extractKeywords(text: string): string[] {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'need', 'to', 'of', 'in',
        'for', 'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but', 'if',
        'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'i',
        'me', 'we', 'us', 'he', 'she', 'they', 'them', 'what', 'which',
        'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
        'hi', 'hello', 'please', 'thanks', 'thank', 'ok', 'okay',
        // Nepali common words (romanized)
        'ho', 'cha', 'huncha', 'ke', 'ma', 'lai', 'ko', 'le', 'ni', 'ra',
    ]);

    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)].slice(0, 10);
}
