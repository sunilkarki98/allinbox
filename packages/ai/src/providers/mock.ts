import { AIProvider, AnalysisResult, InteractionContext } from '../types.js';

export class MockProvider implements AIProvider {
    name = 'Mock';

    async analyzeInteraction(text: string, context: InteractionContext): Promise<AnalysisResult> {
        // Simple keyword-based simulation
        const lowerText = text.toLowerCase();
        let intent: any = 'general';
        let sentiment: any = 'neutral';
        let suggestion = 'Thank you for your message.';

        if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('pay')) {
            intent = 'pricing_inquiry';
            suggestion = 'The price depends on the item. Which one are you interested in?';
        } else if (lowerText.includes('deliver') || lowerText.includes('shipping') || lowerText.includes('location')) {
            intent = 'shipping_inquiry';
            suggestion = 'We deliver inside Kathmandu Valley. Where are you located?';
        } else if (lowerText.includes('bad') || lowerText.includes('broken') || lowerText.includes('worst')) {
            intent = 'complaint';
            sentiment = 'negative';
            suggestion = 'We are sorry to hear that. Can you please provide more details?';
        } else if (lowerText.includes('good') || lowerText.includes('love') || lowerText.includes('wow')) {
            intent = 'general_comment';
            sentiment = 'positive';
            suggestion = 'Thank you so much!';
        }

        return {
            intent,
            confidence: 0.85,
            sentiment,
            suggestion,
            reasoning: 'Keyword matching (Mock)'
        };
    }
}
