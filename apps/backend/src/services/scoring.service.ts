import { db } from '../db/index.js';
import { customers } from '@allinbox/db';
import { eq, and } from 'drizzle-orm';

export class ScoringService {
    private static HALF_LIFE_DAYS = 7;

    private static INTERACTION_WEIGHTS: Record<string, number> = {
        'DM': 2.5,
        'COMMENT': 1.0,
        'SHARE': 0.5,
        'LIKE': 0.1
    };

    // ALIGNED: All intents from AIIntentSchema are now scored
    private static INTENT_SCORES: Record<string, number> = {
        'purchase_intent': 50,
        'pricing_inquiry': 30,
        'shipping_inquiry': 25,
        'service_inquiry': 20,
        'support_issue': 10,
        'general_comment': 5,
        'general': 2,
        'complaint': -15,
        'spam': -100
    };

    /**
     * Calculates the "Effective Score" based on time decay.
     * Formula: Score * (0.5 ^ (DaysSinceInteraction / HalfLife))
     */
    static calculateDecayedScore(currentScore: number, lastInteractionAt: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastInteractionAt.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        const decayFactor = Math.pow(0.5, diffDays / this.HALF_LIFE_DAYS);
        return Math.round(currentScore * decayFactor);
    }

    /**
     * Determines lead stage transition based on total score.
     */
    static determineStatus(score: number): 'COLD' | 'WARM' | 'HOT' {
        if (score >= 500) return 'HOT';
        if (score >= 100) return 'WARM';
        return 'COLD';
    }

    /**
     * Calculates the score increment for a new interaction.
     */
    static calculateIncrement(payload: {
        intent: string;
        confidence: number;
        sentiment: string;
        type: string;
    }): number {
        const baseScore = this.INTENT_SCORES[payload.intent] ?? 0;
        const typeMultiplier = this.INTERACTION_WEIGHTS[payload.type] ?? 1.0;

        let weightedScore = baseScore * (payload.confidence / 100) * typeMultiplier;

        if (payload.sentiment === 'negative' && weightedScore > 0) {
            weightedScore = weightedScore * -0.5;
        }

        return Math.round(weightedScore);
    }

    /**
     * Upserts a lead's profile after a new interaction.
     * Handles creation, time decay, and status transitions.
     */
    /**
     * Updates a customer's profile score after a new interaction.
     * Handles time decay and status transitions on the UNIFIED profile.
     */
    static async updateCustomerScore(
        tx: any,
        customerId: string,
        interaction: { type: string }, // We only need type for weighting
        analysis: { intent: string; confidence: number; sentiment: string }
    ) {
        // 1. Find existing customer
        // We assume customerId is valid as it comes from the interaction link
        const [customer] = await tx.select().from(require('@allinbox/db').customers).where(
            eq(require('@allinbox/db').customers.id, customerId)
        ).limit(1);

        if (!customer) {
            throw new Error(`Customer ${customerId} not found for scoring update`);
        }

        const increment = this.calculateIncrement({
            intent: analysis.intent,
            confidence: analysis.confidence,
            sentiment: analysis.sentiment,
            type: interaction.type
        });

        // Apply time decay to current score before adding increment
        const decayedCurrentScore = this.calculateDecayedScore(
            customer.totalLeadScore ?? 0,
            customer.lastInteractionAt || customer.updatedAt || new Date()
        );

        const newScore = Math.max(0, Math.min(decayedCurrentScore + increment, 10000));
        const newStatus = this.determineStatus(newScore);

        const [updated] = await tx.update(require('@allinbox/db').customers).set({
            totalLeadScore: newScore,
            status: newStatus,
            lastIntent: analysis.intent,
            totalInteractions: (customer.totalInteractions || 0) + 1,
            lastInteractionAt: new Date(),
            updatedAt: new Date()
        }).where(eq(require('@allinbox/db').customers.id, customerId)).returning({
            id: require('@allinbox/db').customers.id,
            leadScore: require('@allinbox/db').customers.totalLeadScore
        });

        return updated;
    }
}
