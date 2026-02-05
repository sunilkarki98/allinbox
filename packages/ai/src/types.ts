import { z } from 'zod';

export const AIIntentSchema = z.enum([
    'purchase_intent',
    'shipping_inquiry',
    'service_inquiry',
    'pricing_inquiry',
    'complaint',
    'general_comment',
    'spam',
    'general' // Fallback
]);

export type AIIntent = z.infer<typeof AIIntentSchema>;

export const AISentimentSchema = z.enum(['positive', 'neutral', 'negative']);

export type AISentiment = z.infer<typeof AISentimentSchema>;

export interface InteractionContext {
    businessName: string;
    language: string;
    previousMessages?: string[]; // Simplified history
    // Optional config for dynamic model selection
    modelConfig?: {
        model: string;
    };
}

export interface AnalysisResult {
    intent: AIIntent;
    confidence: number;
    sentiment: AISentiment;
    suggestion: string;
    reasoning?: string; // Optional reasoning for debugging
}

export interface AIProvider {
    name: string;
    analyzeInteraction(text: string, context: InteractionContext): Promise<AnalysisResult>;
}

// Model Discovery Types
export interface AIModel {
    name: string;   // models/gemini-1.5-pro-latest
    version: string; // 1.5-pro-latest
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
}
