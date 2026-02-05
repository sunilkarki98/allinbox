import { db } from '../db/index.js';
import { interactions, tenants, leads, posts, offerings } from '@allinbox/db';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

async function seed() {
    console.log('🌱 Seeding database with full conversation data...');

    // 1. Get tenant (SME owner)
    let tenantsList = await db.select().from(tenants).where(eq(tenants.email, 'suneelkarkee98@gmail.com')).limit(1);
    let tenant = tenantsList[0];

    if (!tenant) {
        tenantsList = await db.select().from(tenants).where(eq(tenants.email, 'demo@allinbox.com')).limit(1);
        tenant = tenantsList[0];
    }

    if (!tenant) {
        console.log('   Creating new tenant...');
        const [newTenant] = await db.insert(tenants).values({
            email: 'demo@allinbox.com',
            passwordHash: '$2b$12$e/y.d.k.i.s.h.e.r.e.!.!.!.!.!.!.!.!.!.!.!.!.!.!', // Dummy hash
            businessName: 'My Awesome Shop',
            status: 'ACTIVE'
        }).returning();
        tenant = newTenant;
    }

    console.log(`👤 Seeding for tenant: ${tenant.email}`);

    // Clear existing data for this tenant
    // Note: Cascading deletes should handle children, but let's be safe or rely on cascade
    try {
        await db.delete(interactions).where(eq(interactions.tenantId, tenant.id));
        await db.delete(offerings).where(eq(offerings.tenantId, tenant.id));
        await db.delete(posts).where(eq(posts.tenantId, tenant.id));
        // leads? maybe keep them or clear them. Let's clear to prevent dupes if not using onConflict properly
        // dependent interactions already deleted.
    } catch (e) {
        console.log('   Error clearing old data, continuing...', e);
    }

    console.log('   Cleared old tenant data');

    // 2. Create leads (SME's potential customers)
    const sampleLeads = [
        { platform: 'INSTAGRAM', username: 'fashion_maya', displayName: 'Maya Sharma' },
        { platform: 'INSTAGRAM', username: 'style_rina', displayName: 'Rina K' },
        { platform: 'INSTAGRAM', username: 'shopaholic_priya', displayName: 'Priya Singh' },
        { platform: 'TIKTOK', username: 'trend_anita', displayName: 'Anita Trendz' },
        { platform: 'TIKTOK', username: 'dance_queen_ktm', displayName: 'KTM Dancer' },
    ];

    const leadMap = new Map<string, string>();

    for (const l of sampleLeads) {
        try {
            const [newLead] = await db.insert(leads).values({
                tenantId: tenant.id,
                platform: l.platform as any,
                platformUsername: l.username,
                displayName: l.displayName,
                leadScore: Math.floor(Math.random() * 50) + 50,
            }).onConflictDoNothing().returning();

            if (newLead) {
                leadMap.set(l.username, newLead.id);
            } else {
                // Already exists, fetch it
                const [existing] = await db.select().from(leads)
                    .where(eq(leads.platformUsername, l.username))
                    .limit(1);
                if (existing) leadMap.set(l.username, existing.id);
            }
        } catch (e) {
            console.log(`   Lead ${l.username} already exists, skipping`);
        }
    }

    // 3. Define and Insert Posts & Products
    // We need to insert posts to get IDs for interactions
    const rawPosts = [
        {
            url: 'https://instagram.com/p/summer_floral_dress_2024',
            imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&q=80',
            caption: 'Summer Floral Dress 🌸 - New Arrival!',
            platform: 'INSTAGRAM',
            likes: 1247,
            shares: 89,
            productName: 'Summer Floral Dress',
            productPrice: 'Rs. 2,500'
        },
        {
            url: 'https://instagram.com/p/red_sneakers_limited',
            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80',
            caption: 'Red Sneakers - Limited Edition 👟🔥',
            platform: 'INSTAGRAM',
            likes: 3420,
            shares: 256,
            productName: 'Red Sneakers Limited Edition',
            productPrice: 'Rs. 4,999'
        },
        {
            url: 'https://tiktok.com/@video/viral_bag_collection',
            imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&q=80',
            caption: 'Handbag Collection - Going Viral! 👜',
            platform: 'TIKTOK',
            likes: 15800,
            shares: 1230,
            productName: 'Designer Handbag',
            productPrice: 'Rs. 3,200'
        },
    ];

    const postsMap = new Map<number, string>(); // idx -> postId

    for (let i = 0; i < rawPosts.length; i++) {
        const p = rawPosts[i];
        const [insertedPost] = await db.insert(posts).values({
            tenantId: tenant.id,
            platform: p.platform as any,
            externalId: uuidv4(), // Mock external ID
            url: p.url,
            imageUrl: p.imageUrl,
            caption: p.caption,
            likes: p.likes,
            shares: p.shares
        }).returning();

        if (insertedPost) {
            postsMap.set(i, insertedPost.id);

            // Create associated offering (product type)
            await db.insert(offerings).values({
                tenantId: tenant.id,
                postId: insertedPost.id,
                type: 'PRODUCT',
                name: p.productName,
                price: p.productPrice,
                description: p.caption,
                isAvailable: true
            });
        }
    }

    // 4. Full Conversations with Customer + Owner Replies
    const conversations = [
        // === CONVERSATION 1: fashion_maya - Floral Dress ===
        // Customer Comment
        {
            username: 'fashion_maya',
            postIdx: 0,
            text: 'Is this available in size M? 😍',
            intent: 'purchase_intent',
            type: 'COMMENT',
            urgent: false,
            minutesAgo: 180,
            // Owner replied
            replyText: 'Yes, Size M is in stock! DM us to order 💕',
            repliedMinutesAgo: 175
        },
        // Customer DMs after seeing comment reply
        {
            username: 'fashion_maya',
            postIdx: 0,
            text: 'Hi! I saw your reply. I want to order the floral dress in size M.',
            intent: 'purchase_intent',
            type: 'DM',
            urgent: false,
            minutesAgo: 120,
            replyText: 'Perfect! Total is Rs. 2,500 + Rs. 150 delivery = Rs. 2,650. Please send your location 📍',
            repliedMinutesAgo: 115
        },
        // Customer replies with location
        {
            username: 'fashion_maya',
            postIdx: 0,
            text: 'Kathmandu, Baneshwor. Can you deliver tomorrow?',
            intent: 'purchase_intent',
            type: 'DM',
            urgent: true,
            minutesAgo: 30,
            // NOT YET REPLIED - urgent action needed
            replyText: null,
            repliedMinutesAgo: null
        },

        // === CONVERSATION 2: style_rina - Just a pricing question ===
        {
            username: 'style_rina',
            postIdx: 0,
            text: 'What is the price?',
            intent: 'pricing_inquiry',
            type: 'COMMENT',
            urgent: false,
            minutesAgo: 90,
            replyText: 'Rs. 2,500 only! Free delivery in Kathmandu',
            repliedMinutesAgo: 85
        },

        // === CONVERSATION 3: trend_anita - Red Sneakers ===
        {
            username: 'trend_anita',
            postIdx: 1,
            text: 'Do you deliver to Pokhara?',
            intent: 'shipping_inquiry',
            type: 'COMMENT',
            urgent: false,
            minutesAgo: 150,
            replyText: 'Yes we deliver nationwide! Rs. 200 extra for outside valley.',
            repliedMinutesAgo: 145
        },
        {
            username: 'trend_anita',
            postIdx: 1,
            text: 'Great! I want to order size 38. How to pay?',
            intent: 'purchase_intent',
            type: 'DM',
            urgent: false,
            minutesAgo: 60,
            replyText: 'You can pay via eSewa, Khalti, or Cash on Delivery. Which works for you?',
            repliedMinutesAgo: 55
        },
        {
            username: 'trend_anita',
            postIdx: 1,
            text: 'eSewa please. Size 38 still available?',
            intent: 'purchase_intent',
            type: 'DM',
            urgent: true,
            minutesAgo: 10,
            // NOT REPLIED - needs action
            replyText: null,
            repliedMinutesAgo: null
        },

        // === CONVERSATION 4: dance_queen_ktm - TikTok Bag ===
        {
            username: 'dance_queen_ktm',
            postIdx: 2,
            text: 'Price please? 💵',
            intent: 'pricing_inquiry',
            type: 'COMMENT',
            urgent: false,
            minutesAgo: 45,
            replyText: 'Rs. 1,800 only! Very popular item 🔥',
            repliedMinutesAgo: 42
        },
        {
            username: 'dance_queen_ktm',
            postIdx: 2,
            text: 'Do you have black color?',
            intent: 'purchase_intent',
            type: 'COMMENT',
            urgent: false,
            minutesAgo: 40,
            replyText: 'Yes! Black, Brown, and Beige available.',
            repliedMinutesAgo: 38
        },
        {
            username: 'dance_queen_ktm',
            postIdx: 2,
            text: 'Perfect! I want black. Payment via eSewa ok?',
            intent: 'purchase_intent',
            type: 'DM',
            urgent: true,
            minutesAgo: 5,
            // NOT REPLIED - hot lead
            replyText: null,
            repliedMinutesAgo: null
        },

        // === STANDALONE: shopaholic_priya - Support Request ===
        {
            username: 'shopaholic_priya',
            postIdx: -1,
            text: 'Where is my order #5678? Still waiting.',
            intent: 'support_request',
            type: 'DM',
            urgent: true,
            minutesAgo: 15,
            replyText: null,
            repliedMinutesAgo: null
        },
    ];

    // Insert all conversations
    for (const item of conversations) {
        const leadId = leadMap.get(item.username);
        const postId = item.postIdx >= 0 ? postsMap.get(item.postIdx) : null;
        const post = item.postIdx >= 0 ? rawPosts[item.postIdx] : null;

        await db.insert(interactions).values({
            tenantId: tenant.id,
            leadId: leadId || null,
            postId: postId,

            platform: (post ? post.platform : 'INSTAGRAM') as any,
            type: item.type as any,
            externalId: uuidv4(),
            senderUsername: item.username,
            contentText: item.text,

            receivedAt: new Date(Date.now() - item.minutesAgo * 60 * 1000),
            aiIntent: item.intent,
            aiConfidence: 85 + Math.floor(Math.random() * 10),
            flagUrgent: item.urgent,
            isReplied: !!item.replyText,
            replyText: item.replyText || null,
            repliedAt: item.repliedMinutesAgo ? new Date(Date.now() - item.repliedMinutesAgo * 60 * 1000) : null,
        });
    }

    console.log('✅ Database seeded successfully!');
    console.log(`   - ${sampleLeads.length} leads`);
    console.log(`   - ${rawPosts.length} posts (with products)`);
    console.log(`   - ${conversations.length} interactions`);
    process.exit(0);
}

seed().catch(err => {
    console.error('Failed to seed:', err);
    process.exit(1);
});
