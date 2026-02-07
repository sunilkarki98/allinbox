import { Worker, Job } from 'bullmq';
import { db } from '../db/index.js';
import { interactions, tenants } from '@allinbox/db';
import { AIClient } from '@allinbox/ai';
import { ScoringService } from '../services/scoring.service.js';
import { eq } from 'drizzle-orm';

import { getBullConnection, dragonfly } from '../utils/clients.js';

// Dragonfly Publisher Client from unified pool
const redisPub = dragonfly.getClient();

export const analysisWorker = new Worker('analysis-queue', async (job: Job) => {
    const { interactionId } = job.data;
    console.log(`Analyzing interaction: ${interactionId}`);

    try {
        // 1. Fetch Interaction
        const [interaction] = await db.select().from(interactions).where(eq(interactions.id, interactionId)).limit(1);

        if (!interaction) {
            console.error(`Interaction ${interactionId} not found`);
            return;
        }

        // 2. Fetch Context (Tenant)
        const [tenant] = await db.select({
            id: tenants.id,
            businessName: tenants.businessName,
            language: tenants.language
        })
            .from(tenants)
            .where(eq(tenants.id, interaction.tenantId))
            .limit(1);

        // FAIL-SAFE CONTEXT (Audit Fix)
        // If business name is missing (new tenant), use a generic fallback
        // to prevent processing deadlocks.
        const safeBusinessName = (tenant?.businessName && tenant.businessName.trim() !== '')
            ? tenant.businessName
            : 'Valued Customer';

        // Log warning but proceed
        if (safeBusinessName === 'Valued Customer') {
            console.warn(`[Analysis] Tenant ${interaction.tenantId} has no business name. Using fallback.`);
        }

        // 3. Check for Admin Model Override (optional - auto-discovery is default)
        const { SystemSettingsService } = await import('../services/system-settings.service.js');
        const adminModelOverride = await SystemSettingsService.get('AI_MODEL');

        // If admin hasn't set AI_MODEL, it will be auto-discovered by ModelDiscoveryService
        // in the GeminiProvider using the API key. This ensures latest models are used.
        const context = {
            businessName: safeBusinessName,
            language: tenant.language || 'en',
            // Only pass modelConfig if admin has explicitly set a model override
            modelConfig: adminModelOverride ? { model: adminModelOverride } : undefined
        };

        // 4. Perform AI Analysis with Context
        // Using the shared @allinbox/ai package with Gemini/Mock support
        const analysis = await AIClient.getInstance().analyzeInteraction(
            interaction.contentText,
            context
        );

        // threshold for manual review
        const flagLowConfidence = analysis.confidence < 70;
        const isSpam = analysis.intent === 'spam';

        // 3. AI Analysis & DB Update in Transaction
        const result = await db.transaction(async (tx) => {
            // 1. Update Interaction with AI Results (including traceability fields)
            await tx.update(interactions).set({
                aiIntent: analysis.intent,
                aiConfidence: analysis.confidence,
                aiSuggestion: analysis.suggestion,
                sentiment: analysis.sentiment,
                flagLowConfidence,
                isSpam,
                // AI Traceability (Audit Compliance)
                aiModelVersion: analysis.modelVersion || 'unknown',
                aiAnalyzedAt: new Date(),
                aiReasoning: analysis.reasoning || null
            }).where(eq(interactions.id, interactionId));

            // 2. Update or Create Lead Score via Service (Targeting Unified Customer)
            if (interaction.customerId) {
                const updatedCustomer = await ScoringService.updateCustomerScore(
                    tx,
                    interaction.customerId,
                    { type: interaction.type }, // Pass type for weighting
                    analysis
                );

                // Result for event publishing
                return { id: updatedCustomer.id, leadScore: updatedCustomer.leadScore };
            } else {
                console.warn(`Interaction ${interactionId} has no customerId, skipping scoring.`);
                return { id: null, leadScore: 0 };
            }
        });

        console.log(`Analysis complete for ${interactionId}. Intent: ${analysis.intent} (Conf: ${analysis.confidence})`);

        // 5. Emit Real-Time Event (Outside Transaction)
        await redisPub.publish(`tenant:${interaction.tenantId}:events`, JSON.stringify({
            tenantId: interaction.tenantId,
            type: 'INTERACTION_ANALYZED',
            data: {
                id: interaction.id,
                aiIntent: analysis.intent,
                aiConfidence: analysis.confidence,
                aiSuggestion: analysis.suggestion,
                flagLowConfidence,
                isSpam,
                leadId: result.id,
                leadScore: result.leadScore
            }
        }));

    } catch (err) {
        console.error(`Analysis failed for ${interactionId}:`, err);
        throw err;
    }
}, {
    connection: getBullConnection(),
    autorun: false,
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 2000
    }
});
