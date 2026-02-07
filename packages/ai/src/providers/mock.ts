import { AIProvider, AnalysisResult, InteractionContext } from '../types.js';

export class MockProvider implements AIProvider {
    name = 'Mock';

    async analyzeInteraction(text: string, context: InteractionContext): Promise<AnalysisResult> {
        // Edge case: empty input
        if (!text || text.trim().length === 0) {
            return {
                intent: 'general',
                confidence: 0,
                sentiment: 'neutral',
                suggestion: '',
                reasoning: 'Empty input - skipped',
                modelVersion: 'mock-v1'
            };
        }

        // Edge case: Media-only
        if (text === '[Media]' || text === '[media]') {
            return {
                intent: 'general_comment',
                confidence: 50,
                sentiment: 'neutral',
                suggestion: 'Thanks for sharing!',
                reasoning: 'Media-only message',
                modelVersion: 'mock-v1'
            };
        }

        // Simple keyword-based simulation
        const lowerText = text.toLowerCase();
        let intent: any = 'general';
        let sentiment: any = 'neutral';
        let suggestion = 'Thank you for your message.';
        let confidence = 85; // 0-100 scale

        // Pricing/Purchase detection
        if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('pay') ||
            lowerText.includes('how much') || lowerText.includes('kati') || lowerText.includes('कति')) {
            intent = 'pricing_inquiry';
            suggestion = 'The price depends on the item. Which one are you interested in?';
        } else if (lowerText.includes('buy') || lowerText.includes('order') || lowerText.includes('want') ||
            lowerText.includes('purchase') || lowerText.includes('get this')) {
            intent = 'purchase_intent';
            suggestion = 'Great! Please DM us to complete your order.';
        } else if (lowerText.includes('deliver') || lowerText.includes('shipping') || lowerText.includes('location')) {
            intent = 'shipping_inquiry';
            suggestion = 'We deliver inside Kathmandu Valley. Where are you located?';
        } else if (lowerText.includes('bad') || lowerText.includes('broken') || lowerText.includes('worst') ||
            lowerText.includes('not working') || lowerText.includes('never arrived') || lowerText.includes('late')) {
            intent = 'complaint';
            sentiment = 'negative';
            suggestion = 'We are sorry to hear that. Can you please provide more details?';
        } else if (lowerText.includes('good') || lowerText.includes('love') || lowerText.includes('wow') ||
            lowerText.includes('amazing') || lowerText.includes('great')) {
            intent = 'general_comment';
            sentiment = 'positive';
            suggestion = 'Thank you so much!';
        } else if (lowerText.includes('win') || lowerText.includes('free') || lowerText.includes('click here') ||
            lowerText.includes('$1000') || lowerText.includes('work from home')) {
            intent = 'spam';
            confidence = 95;
            suggestion = '';
        } else if (lowerText.match(/^[\p{Emoji}\s]+$/u)) {
            // Emoji-only detection
            intent = 'general_comment';
            confidence = 60;
            suggestion = 'Thanks! 😊';
        }

        return {
            intent,
            confidence,
            sentiment,
            suggestion,
            reasoning: 'Keyword matching (Mock)',
            modelVersion: 'mock-v1'
        };
    }
}
