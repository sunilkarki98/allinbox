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
        try {
            // preparing the prompt
            const systemPrompt = CLASSIFICATION_SYSTEM_PROMPT
                .replace('{{businessName}}', context.businessName)
                .replace('{{language}}', context.language);

            const finalPrompt = `${systemPrompt}\n\nUSER MESSAGE:\n"${text}"\n\nJSON OUTPUT:`;

            // Dynamic Model Resolution
            let modelToUse = this.model;

            // 1. Check if specific model requested in context
            let modelName = context.modelConfig?.model;

            // 2. If not, auto-detect best model
            if (!modelName) {
                const { ModelDiscoveryService } = await import('../discovery.js');
                modelName = await ModelDiscoveryService.getBestModel(this.apiKey);
            }

            // 3. Re-instantiate model if different from default
            if (modelName) {
                const genAI = new GoogleGenerativeAI(this.apiKey);
                modelToUse = genAI.getGenerativeModel({ model: modelName });
            }

            const result = await modelToUse.generateContent(finalPrompt);
            const response = await result.response;
            const textResponse = response.text();

            // Safe parsing of JSON block (sometimes LLMs wrap in markdown code blocks)
            const cleanJson = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            const data = JSON.parse(cleanJson);

            return {
                intent: data.intent || 'general',
                confidence: data.confidence || 0.5,
                sentiment: data.sentiment || 'neutral',
                suggestion: data.suggestion || '',
                reasoning: `Analyzed by ${modelName || 'Default'} (${this.name})`
            };

        } catch (error) {
            console.error('Gemini Analysis Failed:', error);
            // Fallback to safe default
            return {
                intent: 'general',
                confidence: 0,
                sentiment: 'neutral',
                suggestion: '',
                reasoning: 'Error in AI Provider'
            };
        }
    }
}
