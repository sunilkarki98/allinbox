import { GeminiProvider } from './providers/gemini.js';
import { MockProvider } from './providers/mock.js';
import { AIProvider } from './types.js';

export * from './types.js';
export * from './discovery.js';

/**
 * AI Client Factory
 * Automatically selects the best provider based on environment variables.
 */
export class AIClient {
    private static instance: AIProvider;

    static getInstance(): AIProvider {
        if (!this.instance) {
            const apiKey = process.env.GEMINI_API_KEY;

            if (apiKey) {
                console.log('✨ Initializing Gemini AI Provider');
                this.instance = new GeminiProvider(apiKey);
            } else {
                console.warn('⚠️ No AI API Key found. Using Mock Provider.');
                this.instance = new MockProvider();
            }
        }
        return this.instance;
    }
}
