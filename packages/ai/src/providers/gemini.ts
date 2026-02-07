import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AnalysisResult, InteractionContext } from '../types.js';
import { CLASSIFICATION_SYSTEM_PROMPT } from '../prompts/classification.js';

export class GeminiProvider implements AIProvider {
    name = 'Gemini';
    private model: any;

    constructor(private apiKey: string) {
        if (!apiKey) {
            console.warn('⚠️ Gemini API Key missing! Provider will fail if used.');
        }
        // Initialize with default, but will override in analyzeInteraction
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async analyzeInteraction(text: string, context: InteractionContext): Promise<AnalysisResult> {
        // Track which model we're using
        let modelName = 'gemini-1.5-flash'; // Default

        try {
            // Edge case handling: empty or very short text
            if (!text || text.trim().length === 0) {
                return {
                    intent: 'general',
                    confidence: 0,
                    sentiment: 'neutral',
                    suggestion: '',
                    reasoning: 'Empty input - skipped AI analysis',
                    modelVersion: 'skipped'
                };
            }

            // Edge case: Media-only placeholder
            if (text === '[Media]' || text === '[media]') {
                return {
                    intent: 'general_comment',
                    confidence: 50,
                    sentiment: 'neutral',
                    suggestion: 'Thanks for sharing!',
                    reasoning: 'Media-only message - default classification',
                    modelVersion: 'heuristic'
                };
            }

            // preparing the prompt
            const systemPrompt = CLASSIFICATION_SYSTEM_PROMPT
                .replace('{{businessName}}', context.businessName)
                .replace('{{language}}', context.language);

            const finalPrompt = `${systemPrompt}\n\nUSER MESSAGE:\n"${text}"\n\nJSON OUTPUT:`;

            // Dynamic Model Resolution
            let modelToUse = this.model;

            // 1. Check if specific model requested in context (admin override)
            modelName = context.modelConfig?.model || modelName;

            // 2. If not, auto-detect best model
            if (!context.modelConfig?.model) {
                const { ModelDiscoveryService } = await import('../discovery.js');
                const discovered = await ModelDiscoveryService.getBestModel(this.apiKey);
                if (discovered) modelName = discovered;
            }

            // 3. Re-instantiate model if different from default
            const genAI = new GoogleGenerativeAI(this.apiKey);
            modelToUse = genAI.getGenerativeModel({ model: modelName });

            // DETERMINISM: Set temperature to 0 for consistent outputs
            const result = await modelToUse.generateContent({
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    temperature: 0,
                    topP: 1,
                    topK: 1,
                }
            });

            const response = await result.response;
            const textResponse = response.text();

            // Safe parsing of JSON block (sometimes LLMs wrap in markdown code blocks)
            const cleanJson = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            const data = JSON.parse(cleanJson);

            // Normalize confidence to 0-100 scale
            let confidence = data.confidence || 0;
            if (confidence <= 1) {
                confidence = Math.round(confidence * 100);
            }

            return {
                intent: data.intent || 'general',
                confidence: confidence,
                sentiment: data.sentiment || 'neutral',
                suggestion: data.suggestion || '',
                reasoning: `Analyzed by ${modelName} (${this.name})`,
                modelVersion: modelName
            };

        } catch (error) {
            // EXPLICIT FAILURE LOGGING (no silent fallback)
            console.error(`[AI ERROR] Gemini Analysis Failed for input "${text.slice(0, 50)}...":`, error);

            // Return with zero confidence to flag as unreliable
            return {
                intent: 'general',
                confidence: 0,
                sentiment: 'neutral',
                suggestion: '',
                reasoning: `Error in AI Provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
                modelVersion: modelName
            };
        }
    }
}
