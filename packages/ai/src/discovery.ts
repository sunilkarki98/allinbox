import { AIModel } from './types.js';

/**
 * Service to discover available Gemini models dynamically.
 * API Endpoint: https://generativelanguage.googleapis.com/v1beta/models
 * 
 * This ensures the system always uses the latest available models
 * without requiring code updates when Google releases new versions.
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

            console.log(`[ModelDiscovery] Found ${contentModels.length} available models`);
            return contentModels;

        } catch (error) {
            console.error('Error discovering AI models:', error);
            return [];
        }
    }

    /**
     * Determines the "best" available model based on heuristics.
     * Priority (updated for 2024/2025 models):
     * 1. Gemini 2.0 Flash (latest, fast, multimodal)
     * 2. Gemini 2.0 Pro (if available)
     * 3. Gemini 1.5 Pro Latest
     * 4. Gemini 1.5 Flash
     * 5. Fallback to hardcoded safe default
     */
    static async getBestModel(apiKey: string): Promise<string> {
        const models = await this.getAvailableModels(apiKey);

        if (models.length === 0) {
            console.warn('[ModelDiscovery] No models found, using fallback');
            return 'gemini-2.0-flash';
        }

        // Log available models for debugging
        const modelNames = models.map(m => m.name.replace('models/', ''));
        console.log(`[ModelDiscovery] Available: ${modelNames.slice(0, 5).join(', ')}...`);

        // Helper to find model by pattern
        const findModel = (patterns: string[]): string | null => {
            for (const pattern of patterns) {
                const found = models.find(m => m.name.toLowerCase().includes(pattern.toLowerCase()));
                if (found) return found.name.replace('models/', '');
            }
            return null;
        };

        // Priority order for best model selection
        const priority = [
            // Gemini 2.0 (latest generation)
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash',
            'gemini-2.0-pro',
            // Gemini 1.5 with latest alias
            'gemini-1.5-pro-latest',
            'gemini-1.5-flash-latest',
            // Gemini 1.5 stable
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            // Legacy fallback
            'gemini-pro'
        ];

        const bestModel = findModel(priority);

        if (bestModel) {
            console.log(`[ModelDiscovery] Selected best model: ${bestModel}`);
            return bestModel;
        }

        // If no known model found, just pick the first content-capable model
        if (models.length > 0) {
            const fallback = models[0].name.replace('models/', '');
            console.log(`[ModelDiscovery] Using first available: ${fallback}`);
            return fallback;
        }

        return 'gemini-2.0-flash';
    }

    /**
     * Clear the model cache to force re-discovery.
     */
    static clearCache(): void {
        this.cache = null;
        this.lastFetch = 0;
        console.log('[ModelDiscovery] Cache cleared');
    }
}

