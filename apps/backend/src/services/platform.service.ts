import { SystemSettingsService } from './system-settings.service.js';

// =============================================================================
// TYPES
// =============================================================================

export type PlatformType = 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'TIKTOK';

export interface FetchedPost {
    externalId: string;
    platform: PlatformType;
    url: string;
    imageUrl: string;
    caption: string;
    likes: number;
    shares: number;
    commentsCount: number;
    postedAt: Date;
}

export interface FetchedInteraction {
    externalId: string;
    platform: PlatformType;
    type: 'COMMENT' | 'DM' | 'LIKE' | 'SHARE';
    senderUsername: string;
    senderId?: string;  // Platform user ID for unified profile lookup
    contentText: string;
    receivedAt: Date;
    // Link to post (for comments, likes, shares)
    postExternalId?: string;
    // Post reference for DMs (e.g., "I saw your floral dress post")
    postReference?: string;
    // Explicit Referral (from Ads or "Click to Message")
    referral?: {
        ref?: string;      // The "ref" param from the ad/link
        source?: string;   // "SHORTLINK", "ADS", etc.
        adId?: string;     // Meta Ad ID
        type?: string;     // "OPEN_THREAD", etc.
    };
    mediaUrls?: string[];
    verb?: 'add' | 'edit' | 'remove';
}

export interface FetchResult {
    posts: FetchedPost[];
    interactions: FetchedInteraction[];
}

// =============================================================================
// MOCK DATA - Realistic Nepal SME Products (Multi-Channel)
// =============================================================================

const MOCK_POSTS: FetchedPost[] = [
    // Instagram Posts
    {
        externalId: 'ig_post_floral_dress_001',
        platform: 'INSTAGRAM',
        url: 'https://instagram.com/p/abc123floral',
        imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        caption: '🌸 Summer Floral Maxi Dress - Rs. 2,500 Only!\nFree delivery inside Kathmandu Valley 🚚\nDM to order 📩',
        likes: 1240,
        shares: 45,
        commentsCount: 67,
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
        externalId: 'ig_post_sneakers_002',
        platform: 'INSTAGRAM',
        url: 'https://instagram.com/p/xyz789sneakers',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        caption: '🔥 Limited Edition Red Sneakers - Rs. 4,500\nSizes: 38-44 available\nCash on delivery 💵',
        likes: 890,
        shares: 32,
        commentsCount: 123,
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    // Facebook Posts
    {
        externalId: 'fb_post_laptop_001',
        platform: 'FACEBOOK',
        url: 'https://facebook.com/nepaltechstore/posts/laptop001',
        imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
        caption: '💻 Refurbished Dell Latitude - Rs. 45,000\n1 Year Warranty! Genuine Windows 11\n📍 New Road, Kathmandu',
        likes: 567,
        shares: 89,
        commentsCount: 45,
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
        externalId: 'fb_post_catering_002',
        platform: 'FACEBOOK',
        url: 'https://facebook.com/momoqueen/posts/catering002',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400',
        caption: '🥟 Catering Service Available!\nMomo, Chowmein, Thukpa for your events\nMinimum 50 plates • Free delivery 🛵',
        likes: 234,
        shares: 56,
        commentsCount: 78,
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    // TikTok Posts (Coming Soon - included for data completeness)
    {
        externalId: 'tt_post_momo_003',
        platform: 'TIKTOK',
        url: 'https://tiktok.com/@shop/video/momo123',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400',
        caption: 'Homemade Chicken Momo 🥟 Rs. 200/plate\nOrder via DM for delivery in Lalitpur 🛵',
        likes: 5600,
        shares: 234,
        commentsCount: 89,
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
];

const MOCK_USERNAMES: Record<PlatformType, string[]> = {
    INSTAGRAM: [
        'fashionista_ktm', 'style_nepal', 'shopaholic_pokhara', 'trendy_buyer', 'insta_shopper_np'
    ],
    FACEBOOK: [
        'Ram Sharma', 'Sita Devi', 'Hari Prasad', 'Maya Tamang', 'Bishnu Thapa'
    ],
    WHATSAPP: [
        '+977-9841234567', '+977-9812345678', '+977-9801234567', '+977-9823456789', '+977-9867890123'
    ],
    TIKTOK: [
        'tiktok_buyer_np', 'viral_shopper', 'nepali_tiktok_fan'
    ],
};

const MOCK_MESSAGES: { text: string; intent: string }[] = [
    // Product-focused (purchase intent)
    { text: 'Price please? 💵', intent: 'pricing_inquiry' },
    { text: 'Is this still available?', intent: 'purchase_intent' },
    { text: 'I want to buy this. How to order?', intent: 'purchase_intent' },
    { text: 'Size M available?', intent: 'purchase_intent' },
    { text: 'Reserve gardinuhos na, I\'ll pay tomorrow', intent: 'purchase_intent' },
    { text: 'Check DM please, sent payment screenshot', intent: 'purchase_intent' },

    // Service-focused (service inquiry) - NEW
    { text: 'Do you provide catering for 100 people?', intent: 'service_inquiry' },
    { text: 'Can you repair my laptop screen?', intent: 'service_inquiry' },
    { text: 'Home delivery service available?', intent: 'service_inquiry' },
    { text: 'Wedding event ko lagi catering garnu huncha?', intent: 'service_inquiry' },

    // Shipping/Delivery
    { text: 'Do you deliver to Pokhara?', intent: 'shipping_inquiry' },
    { text: 'COD available?', intent: 'shipping_inquiry' },
    { text: 'Delivery charge kati ho?', intent: 'shipping_inquiry' },
    { text: 'How long for delivery to Biratnagar?', intent: 'shipping_inquiry' },

    // Pricing
    { text: 'Last price?', intent: 'pricing_inquiry' },
    { text: 'How much for 2 pieces?', intent: 'pricing_inquiry' },
    { text: 'Bulk order ma discount huncha?', intent: 'pricing_inquiry' },

    // General comments
    { text: 'Nice product! 😍', intent: 'general_comment' },
    { text: 'Love it! ❤️', intent: 'general_comment' },
    { text: 'Wow ramro cha!', intent: 'general_comment' },
];

// WhatsApp-specific messages with post references
const WHATSAPP_MESSAGES: { text: string; intent: string; postReference?: string }[] = [
    { text: 'Hi, I saw your post about the floral dress. Is it available?', intent: 'purchase_intent', postReference: 'floral dress' },
    { text: 'Namaste, catering ko lagi enquiry garna', intent: 'service_inquiry', postReference: 'catering' },
    { text: 'Hello, laptop ko post dekheko thiye. Aauna sakincha hernu?', intent: 'purchase_intent', postReference: 'laptop' },
    { text: 'Sneakers size 42 cha?', intent: 'purchase_intent', postReference: 'sneakers' },
    { text: 'Wedding catering garnu huncha? 200 jana ko lagi', intent: 'service_inquiry', postReference: 'catering' },
];

// =============================================================================
// PLATFORM SERVICE
// =============================================================================

export class PlatformService {
    /**
     * Get credentials for a platform from settings or environment
     */
    static async getCredentials(platform: PlatformType) {
        switch (platform) {
            case 'INSTAGRAM':
                return {
                    clientId: await SystemSettingsService.get('INSTAGRAM_CLIENT_ID') || process.env.INSTAGRAM_CLIENT_ID,
                    clientSecret: await SystemSettingsService.get('INSTAGRAM_CLIENT_SECRET') || process.env.INSTAGRAM_CLIENT_SECRET,
                };
            case 'FACEBOOK':
                return {
                    appId: await SystemSettingsService.get('FACEBOOK_APP_ID') || process.env.FACEBOOK_APP_ID,
                    appSecret: await SystemSettingsService.get('FACEBOOK_APP_SECRET') || process.env.FACEBOOK_APP_SECRET,
                };
            case 'WHATSAPP':
                return {
                    phoneNumberId: await SystemSettingsService.get('WHATSAPP_PHONE_NUMBER_ID') || process.env.WHATSAPP_PHONE_NUMBER_ID,
                    accessToken: await SystemSettingsService.get('WHATSAPP_ACCESS_TOKEN') || process.env.WHATSAPP_ACCESS_TOKEN,
                };
            case 'TIKTOK':
                return {
                    clientKey: await SystemSettingsService.get('TIKTOK_CLIENT_KEY') || process.env.TIKTOK_CLIENT_KEY,
                    clientSecret: await SystemSettingsService.get('TIKTOK_CLIENT_SECRET') || process.env.TIKTOK_CLIENT_SECRET,
                };
        }
    }

    /**
     * Check if platform is currently supported
     */
    static isPlatformSupported(platform: PlatformType): boolean {
        return ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'].includes(platform);
    }

    /**
     * Parse incoming webhook payload into normalized format
     */
    static async parseWebhook(platform: PlatformType, payload: any): Promise<FetchResult> {
        const result: FetchResult = { posts: [], interactions: [] };

        try {
            if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
                // Handle Graph API Webhooks
                if (payload.entry && Array.isArray(payload.entry)) {
                    for (const entry of payload.entry) {
                        // 1. Messaging Events (DMs)
                        if (entry.messaging && Array.isArray(entry.messaging)) {
                            for (const event of entry.messaging) {
                                if (event.message) {
                                    const interaction: FetchedInteraction = {
                                        platform,
                                        type: 'DM',
                                        externalId: event.message.mid || `dm_${Date.now()}_${Math.random()}`,
                                        senderId: event.sender.id,
                                        senderUsername: 'Unknown User',
                                        contentText: event.message.text || '[Media]',
                                        receivedAt: new Date(entry.time || Date.now()),
                                        mediaUrls: event.message.attachments?.map((a: any) => a.payload?.url).filter(Boolean) || [],
                                        verb: 'add', // DMs are usually adds, 'unsend' events are separate
                                    };

                                    // Extract Referral from Message
                                    // 1. Check message.referral (standard entry point)
                                    // 2. Check postback.referral (Get Started buttons)
                                    const refData = event.postback?.referral || event.referral || (event.message && event.message.referral);

                                    if (refData) {
                                        interaction.referral = {
                                            ref: refData.ref,
                                            source: refData.source,
                                            adId: refData.ad_id,
                                            type: refData.type
                                        };
                                        console.log(`[Platform] Extracted Referral:`, interaction.referral);
                                    }

                                    result.interactions.push(interaction);
                                } else if (event.postback) {
                                    // Handle pure postbacks (e.g. "Get Started" click without text)
                                    const interaction: FetchedInteraction = {
                                        platform,
                                        type: 'DM',
                                        externalId: `pb_${Date.now()}_${Math.random()}`,
                                        senderId: event.sender.id,
                                        senderUsername: 'Unknown User',
                                        contentText: event.postback.title || '[Get Started]',
                                        receivedAt: new Date(entry.time || Date.now()),
                                    };

                                    // Extract Referral from Postback
                                    if (event.postback.referral) {
                                        interaction.referral = {
                                            ref: event.postback.referral.ref,
                                            source: event.postback.referral.source,
                                            adId: event.postback.referral.ad_id,
                                            type: event.postback.referral.type
                                        };
                                        console.log(`[Platform] Extracted Referral (Postback):`, interaction.referral);
                                    }

                                    result.interactions.push(interaction);
                                }
                            }
                        }

                        // 2. Changes (Comments, Feed)
                        if (entry.changes && Array.isArray(entry.changes)) {
                            for (const change of entry.changes) {
                                if (change.field === 'feed' || change.field === 'comments') {
                                    const value = change.value;
                                    // Handle comment
                                    if (value.item === 'comment' || value.comment_id) {
                                        // Handle verb (add, edited, delete/remove)
                                        // Graph API uses 'add', 'edited', 'remove'
                                        const rawVerb = value.verb || 'add';
                                        const verb = rawVerb === 'edited' ? 'edit' : rawVerb === 'remove' ? 'remove' : 'add';

                                        result.interactions.push({
                                            platform,
                                            type: 'COMMENT',
                                            externalId: value.comment_id || `cmt_${Date.now()}`,
                                            senderId: value.from.id,
                                            senderUsername: value.from.name || 'Unknown User',
                                            contentText: value.message || '',
                                            receivedAt: new Date(value.created_time * 1000 || Date.now()),
                                            postExternalId: value.post_id ? value.post_id.split('_')[1] : undefined, // Often PageID_PostID
                                            verb,
                                            // Comments don't usually have standard attachment fields in webhook, 
                                            // but might have 'attachment' field in data if expanded.
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (platform === 'WHATSAPP') {
                // Handle WhatsApp Webhooks
                if (payload.entry && Array.isArray(payload.entry)) {
                    for (const entry of payload.entry) {
                        for (const change of entry.changes || []) {
                            if (change.value && change.value.messages) {
                                for (const msg of change.value.messages) {
                                    if (msg.type === 'text') {
                                        result.interactions.push({
                                            platform: 'WHATSAPP',
                                            type: 'DM',
                                            externalId: msg.id,
                                            senderId: msg.from, // Phone number
                                            senderUsername: msg.profile?.name || msg.from,
                                            contentText: msg.text.body,
                                            receivedAt: new Date(parseInt(msg.timestamp) * 1000),
                                        });
                                    } else if (msg.type === 'image') {
                                        // Handle Image
                                        result.interactions.push({
                                            platform: 'WHATSAPP',
                                            type: 'DM',
                                            externalId: msg.id,
                                            senderId: msg.from,
                                            senderUsername: msg.profile?.name || msg.from,
                                            contentText: msg.image.caption || '[Image]',
                                            mediaUrls: [msg.image.id], // Note: Needs media retrieval API, storing ID for now
                                            receivedAt: new Date(parseInt(msg.timestamp) * 1000),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error parsing ${platform} webhook:`, error);
        }

        return result;
    }

    /**
     * Resilient wrapper with retries for platform API calls
     */
    private static async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (retries <= 0) throw error;
            console.warn(`Platform API failed. Retrying in ${delay}ms... (Retries left: ${retries})`);
            await new Promise(r => setTimeout(r, delay));
            return this.withRetry(fn, retries - 1, delay * 2);
        }
    }

    /**
     * Fetch new interactions from platform API
     * Returns BOTH posts and interactions for proper DB population
     */
    static async fetchNewInteractions(platform: PlatformType): Promise<FetchResult> {
        // TikTok is coming soon - return empty result
        if (platform === 'TIKTOK') {
            console.log('📵 TikTok integration coming soon');
            return { posts: [], interactions: [] };
        }

        return this.withRetry(async () => {
            const creds = await this.getCredentials(platform);
            const hasCreds = Object.values(creds).every(v => v);

            console.log(`📥 Fetching new data from ${platform}... (Credentials: ${hasCreds ? '✅' : '❌ Mock'})`);

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            const random = Math.random();

            // Simulate rare intermittent failure (5% chance)
            if (random < 0.05) {
                throw new Error('500 Internal Server Error (Simulated Platform Flicker)');
            }

            // 30% chance of no new data
            if (random < 0.3) {
                console.log(`  └─ No new data`);
                return { posts: [], interactions: [] };
            }

            // Generate realistic mock data based on platform
            return this.generateMockData(platform);
        });
    }

    /**
     * Generate realistic mock data for testing
     * In production, this would be replaced with real API calls
     */
    private static generateMockData(platform: PlatformType): FetchResult {
        const posts: FetchedPost[] = [];
        const interactions: FetchedInteraction[] = [];

        // Pick posts matching the platform
        const platformPosts = MOCK_POSTS.filter(p => p.platform === platform);
        const selectedPosts = platformPosts.slice(0, 1 + Math.floor(Math.random() * 2));

        for (const post of selectedPosts) {
            // Add post to results (will be upserted)
            posts.push({
                ...post,
                // Randomize engagement slightly
                likes: post.likes + Math.floor(Math.random() * 50),
                commentsCount: post.commentsCount + Math.floor(Math.random() * 5),
            });

            // Generate 1-3 interactions per post
            const interactionCount = 1 + Math.floor(Math.random() * 3);

            for (let i = 0; i < interactionCount; i++) {
                const usernames = MOCK_USERNAMES[platform];
                const username = usernames[Math.floor(Math.random() * usernames.length)];
                const message = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];

                // Platform-specific interaction types
                let type: 'COMMENT' | 'DM' | 'LIKE';
                if (platform === 'WHATSAPP') {
                    type = 'DM'; // WhatsApp is DMs only
                } else {
                    // IG/FB: 60% comments, 30% DMs, 10% likes
                    const typeRandom = Math.random();
                    if (typeRandom < 0.6) {
                        type = 'COMMENT';
                    } else if (typeRandom < 0.9) {
                        type = 'DM';
                    } else {
                        type = 'LIKE';
                    }
                }

                interactions.push({
                    externalId: `${platform.toLowerCase()}_int_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    platform: platform,
                    type: type,
                    senderUsername: username,
                    senderId: `${platform.toLowerCase()}_user_${Math.floor(Math.random() * 1000000)}`,
                    contentText: type === 'LIKE' ? '❤️ Liked your post' : message.text,
                    receivedAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 60 * 1000)),
                    postExternalId: type === 'DM' && Math.random() < 0.3 ? undefined : post.externalId,
                });
            }
        }

        // WhatsApp-specific: Generate DMs with post references
        if (platform === 'WHATSAPP' && Math.random() > 0.5) {
            const waMessage = WHATSAPP_MESSAGES[Math.floor(Math.random() * WHATSAPP_MESSAGES.length)];
            const username = MOCK_USERNAMES.WHATSAPP[Math.floor(Math.random() * MOCK_USERNAMES.WHATSAPP.length)];

            interactions.push({
                externalId: `wa_dm_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                platform: 'WHATSAPP',
                type: 'DM',
                senderUsername: username,
                senderId: username.replace('+', '').replace(/-/g, ''),
                contentText: waMessage.text,
                receivedAt: new Date(),
                postReference: waMessage.postReference, // WhatsApp DM referencing a post
            });
        }

        // Facebook Messenger DM (not linked to any post)
        if (platform === 'FACEBOOK' && Math.random() > 0.6) {
            const username = MOCK_USERNAMES.FACEBOOK[Math.floor(Math.random() * MOCK_USERNAMES.FACEBOOK.length)];
            interactions.push({
                externalId: `fb_dm_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                platform: 'FACEBOOK',
                type: 'DM',
                senderUsername: username,
                senderId: `fb_user_${Math.floor(Math.random() * 1000000)}`,
                contentText: 'Hi, I have a question about your products.',
                receivedAt: new Date(),
            });
        }

        console.log(`  └─ Generated ${posts.length} posts, ${interactions.length} interactions`);
        return { posts, interactions };
    }

    /**
     * Parse webhook payload from Instagram
     */
    static async parseInstagramWebhook(payload: any): Promise<FetchResult> {
        return this.parseWebhook('INSTAGRAM', payload);
    }

    /**
     * Parse webhook payload from Facebook
     */
    static async parseFacebookWebhook(payload: any): Promise<FetchResult> {
        return this.parseWebhook('FACEBOOK', payload);
    }

    /**
     * Parse webhook payload from WhatsApp Business API
     */
    static async parseWhatsAppWebhook(payload: any): Promise<FetchResult> {
        return this.parseWebhook('WHATSAPP', payload);
    }
}
