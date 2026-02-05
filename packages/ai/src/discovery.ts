import { AIModel } from './types.js';

/**
 * Service to discover available Gemini models dynamically.
 * API Endpoint: https://generativelanguage.googleapis.com/v1beta/models
 */
export class ModelDiscoveryService {
    private static readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
    private static cache: AIModel[] | null = null;
    private static lastFetch = 0;
    private static readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

    /**
     * Fetches all available models from Google API.
     */
    static async getAvailableModels(apiKey: string): Promise<AIModel[]> {
        // Return cached if valid
        if (this.cache && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
            return this.cache;
        }

        try {
            const response = await fetch(`${this.BASE_URL}?key=${apiKey}`);
            if (!response.ok) {
                console.error(`Failed to fetch models: ${response.statusText}`);
                return [];
            }

            const data = await response.json();
            const models = (data.models || []).map((m: any) => ({
                name: m.name, // "models/gemini-1.0-pro"
                version: m.version,
                displayName: m.displayName,
                description: m.description,
                inputTokenLimit: m.inputTokenLimit,
                outputTokenLimit: m.outputTokenLimit,
                supportedGenerationMethods: m.supportedGenerationMethods || []
            }));

            // Filter for content generation models only
            const contentModels = models.filter((m: AIModel) =>
                m.supportedGenerationMethods.includes('generateContent')
            );

            this.cache = contentModels;
            this.lastFetch = Date.now();
            return contentModels;

        } catch (error) {
            console.error('Error discovering AI models:', error);
            return [];
        }
    }

    /**
     * Determines the "best" available model based on heuristics.
     * Priority:
     * 1. Latest "Pro" version (e.g. 1.5-pro)
     * 2. Latest "Flash" version (e.g. 1.5-flash)
     * 3. Fallback to hardcoded safe default
     */
    static async getBestModel(apiKey: string): Promise<string> {
        const models = await this.getAvailableModels(apiKey);

        if (models.length === 0) {
            // Fallback if API fails or empty
            return 'gemini-1.5-flash';
        }

        // Sort by version (simple lexicographical sort usually works for 1.0 vs 1.5, 
        // but let's prioritize "latest" keyword or higher numbers)

        // Strategy: Look for specific high-value keywords in the name
        // We prefer "pro" over "flash". We prefer "latest" aliases.

        // 1. Try to find "1.5-pro-latest" or similar
        const proLatest = models.find(m => m.name.includes('gemini-1.5-pro') && m.name.includes('latest'));
        if (proLatest) return proLatest.name.replace('models/', '');

        // 2. Try to find "1.5-pro" (stable)
        const proStable = models.find(m => m.name.includes('gemini-1.5-pro') && !m.name.includes('vision')); // generic text/multimodal
        if (proStable) return proStable.name.replace('models/', '');

        // 3. Try to find "1.5-flash" (fast, efficient)
        const flash = models.find(m => m.name.includes('gemini-1.5-flash'));
        if (flash) return flash.name.replace('models/', '');

        // 4. Fallback to just "gemini-pro" (1.0)
        const classicPro = models.find(m => m.name.includes('gemini-pro'));
        if (classicPro) return classicPro.name.replace('models/', '');

        // 5. Absolute fallback
        return 'gemini-1.5-flash';
    }
}
