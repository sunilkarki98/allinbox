import { Interaction } from '@/lib/mock-data';

// Generic intents suitable for both Product & Service businesses
const GENERIC_INTENT_REPLIES: Record<string, string> = {
    'purchase_intent': "Hi! Thanks for your interest! 🙌 Let me know if you have any specific questions.",
    'pricing_inquiry': "Hi! I'll send you the details in DM. 📩",
    'shipping_inquiry': "We cover most areas! DM me your location/address and I'll confirm. 📍",
    'support_request': "Sorry for the trouble. Let me check that for you right away. 🙏",
    'general': "Thanks for reaching out! How can I help you today? 😊"
};

/**
 * Generates a smart suggestion based on the AI intent and available context.
 * Falls back to generic intent-based replies if no specific AI suggestion exists.
 */
export const processAiSuggestion = (item: Interaction): string => {
    let suggestion = item.aiSuggestion;

    // 1. Valid Suggestion Check
    // If we have a high-confidence AI suggestion from the backend, prefer that.
    if (suggestion && suggestion.trim().length >= 5) {
        return applyContextPlaceholders(suggestion, item);
    }

    // 2. Fallback to Generic Intent
    // If backend AI failed or returned empty, use our safe generic fallback.
    const intent = item.aiIntent || 'general';
    suggestion = GENERIC_INTENT_REPLIES[intent] || GENERIC_INTENT_REPLIES['general'];

    return applyContextPlaceholders(suggestion, item);
};

/**
 * Replaces placeholders like {price}, {name} with actual data from the interaction.
 */
const applyContextPlaceholders = (text: string, item: Interaction): string => {
    let processed = text;

    // Priority: Use stored productPrice, fallback to basic caption extraction
    let extractedPrice: string | undefined = item.productPrice;
    if (!extractedPrice) {
        const priceMatch = item.postCaption?.match(/(?:Rs\.?|₹|NPR|USD|\$|€)\s*[\d,]+(?:\.\d{2})?/i);
        extractedPrice = priceMatch?.[0];
    }

    // Replace Price
    if (extractedPrice) {
        processed = processed.replace(/\{price\}|\{PRICE\}|\[PRICE\]|Rs\.\s*\?+/gi, extractedPrice);
    } else {
        // If price placeholder exists but no price found, make it generic
        processed = processed.replace(/\{price\}|\{PRICE\}|\[PRICE\]|Rs\.\s*\?+/gi, 'the price');
    }

    // Replace Product/Service Name
    if (item.productName) {
        processed = processed.replace(/\{product\}|\{item\}/gi, item.productName);
    } else {
        processed = processed.replace(/\{product\}|\{item\}/gi, 'this item');
    }

    return processed;
};
