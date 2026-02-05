

import { Interaction as DBInteraction } from '@allinbox/types';

export interface YourReply {
    text: string;
    sentAt: Date;
}

export interface Interaction extends Partial<DBInteraction> {
    id: string; // Ensure ID is present
    platform: 'INSTAGRAM' | 'WHATSAPP';
    type: 'COMMENT' | 'DM' | 'LIKE' | 'SHARE';
    senderUsername: string;
    contentText: string;
    receivedAt: Date;
    flagUrgent: boolean;
    isReplied: boolean;
    postUrl?: string;

    // Context Fields
    postId?: string;
    postImage?: string;
    postCaption?: string;
    productName?: string;
    productPrice?: string;
    postLikes?: number;
    postShares?: number;

    // AI Fields
    aiIntent?: string;
    aiConfidence?: number;
    aiSuggestion?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';

    // Lead Context (Joined from leads table)
    leadScore?: number;
    leadTags?: string[] | null;
    leadNotes?: string | null;

    // Owner Reply (from database)
    // repliedAt inherited from DBInteraction
    replyText?: string;

    // Legacy: Your Reply (for mock data compatibility)
    yourReply?: YourReply;
}

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string; // Optional for now
    role?: 'CUSTOMER' | 'SUPER_ADMIN';
    status?: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
}

export const DEMO_INTERACTIONS: Interaction[] = [
    // ===== POST 1: Floral Dress - Full Conversation =====
    // Step 1: Lead comments
    {
        id: 'demo-1a',
        platform: 'INSTAGRAM',
        type: 'COMMENT',
        senderUsername: 'fashionista_amy',
        contentText: 'Is this available in size M?',
        receivedAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        isReplied: true,
        flagUrgent: false,
        postUrl: 'https://instagram.com/p/dress123',
        postId: 'post-1',
        postImage: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100&q=80',
        postCaption: 'Summer Floral Dress 🌸',
        productName: 'Floral Summer Dress',
        productPrice: 'Rs. 2,500',
        postLikes: 1240,
        postShares: 45,
        aiIntent: 'purchase_intent',
        aiConfidence: 92,
        aiSuggestion: 'Yes, Size M is available! Would you like to order?',
        sentiment: 'positive',
        // You already replied to this
        yourReply: {
            text: 'Yes, Size M is in stock! DM us to order 💕',
            sentAt: new Date(Date.now() - 1000 * 60 * 115), // 1h 55m ago
        }
    },
    // Step 2: Lead DMs after your comment reply
    {
        id: 'demo-1b',
        platform: 'INSTAGRAM',
        type: 'DM',
        senderUsername: 'fashionista_amy',
        contentText: 'Hi! I saw your reply. I want to order the floral dress in size M.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        isReplied: true,
        flagUrgent: false,
        postId: 'post-1',
        postImage: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100&q=80',
        postLikes: 1240,
        postShares: 45,
        aiIntent: 'purchase_intent',
        aiConfidence: 95,
        aiSuggestion: 'Great! Total is Rs. 2,500 + Rs. 150 delivery.',
        sentiment: 'positive',
        yourReply: {
            text: 'Perfect! Total is Rs. 2,650 with delivery. Send location please 📍',
            sentAt: new Date(Date.now() - 1000 * 60 * 55),
        }
    },
    // Step 3: Lead replies with follow-up (LATEST - no reply yet)
    {
        id: 'demo-1c',
        platform: 'INSTAGRAM',
        type: 'DM',
        senderUsername: 'fashionista_amy',
        contentText: 'Kathmandu, Baneshwor. Can you deliver tomorrow?',
        receivedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago - NEW!
        isReplied: false,
        flagUrgent: true,
        postId: 'post-1',
        postImage: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100&q=80',
        postLikes: 1240,
        postShares: 45,
        aiIntent: 'purchase_intent',
        aiConfidence: 98,
        aiSuggestion: 'Yes, we can deliver tomorrow by 2 PM! Confirm to proceed.',
        sentiment: 'positive',
        // No reply yet - this needs action!
    },

    // TikTok Demo 2 removed
    // ===== POST 3: Winter Coat =====
    {
        id: 'demo-3',
        platform: 'INSTAGRAM',
        type: 'COMMENT',
        senderUsername: 'shopaholic_nep',
        contentText: 'Do you deliver to Butwal?',
        receivedAt: new Date(Date.now() - 1000 * 60 * 45),
        isReplied: false,
        flagUrgent: false,
        postUrl: 'https://instagram.com/p/abc123',
        postId: 'post-3',
        postImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&q=80',
        postCaption: 'Winter Coat Collection ❄️',
        productName: 'Winter Coat',
        postLikes: 450,
        postShares: 12,
        aiIntent: 'shipping_inquiry',
        aiConfidence: 95,
        aiSuggestion: 'Yes, we deliver nationwide including Butwal!',
        sentiment: 'neutral',
    },

    // ===== Unrelated Support DM =====
    // TikTok Demo 4 removed
    // ===== New Interaction Types =====
    {
        id: 'demo-5',
        platform: 'INSTAGRAM',
        type: 'LIKE',
        senderUsername: 'loyal_fan_1',
        contentText: 'Liked this post',
        receivedAt: new Date(Date.now() - 1000 * 60 * 2), // 2 min ago
        isReplied: false,
        flagUrgent: false,
        postUrl: 'https://instagram.com/p/abc123',
        postId: 'post-3',
        postImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&q=80',
        postCaption: 'Winter Coat Collection ❄️',
        aiIntent: 'engagement',
        aiConfidence: 100,
        leadScore: 10,
    },
    // TikTok Demo 6 removed
];

// Legacy export for backwards compatibility
export const MOCK_INTERACTIONS = DEMO_INTERACTIONS;
