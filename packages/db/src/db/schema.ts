import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { desc } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================
// Platform enum - FACEBOOK added, TIKTOK moved to end (coming soon)
export const platformEnum = pgEnum('platform', ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'TIKTOK']);
export const interactionTypeEnum = pgEnum('interaction_type', ['COMMENT', 'DM', 'LIKE', 'SHARE']);
export const userRoleEnum = pgEnum('user_role', ['CUSTOMER', 'SUPER_ADMIN']);
export const tenantStatusEnum = pgEnum('tenant_status', ['ACTIVE', 'SUSPENDED', 'TRIAL']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['FREE', 'PAID']);
export const leadStatusEnum = pgEnum('lead_status', ['COLD', 'WARM', 'HOT', 'CONVERTED']);
// AI Intent enum for structured intent classification
export const aiIntentEnum = pgEnum('ai_intent', [
    'purchase_intent',    // "I want to buy"
    'service_inquiry',    // "Do you provide this service?" (for service sellers)
    'pricing_inquiry',    // "How much?"
    'shipping_inquiry',   // "Do you deliver?"
    'availability_inquiry', // "Is this available?"
    'general_comment',    // "Nice!" / "Love it"
    'spam'                // Irrelevant/promotional
]);
// Offering type enum for products vs services
export const offeringTypeEnum = pgEnum('offering_type', ['PRODUCT', 'SERVICE']);
export const priceTypeEnum = pgEnum('price_type', ['FIXED', 'HOURLY', 'QUOTE', 'RANGE']);
export const businessTypeEnum = pgEnum('business_type', ['PRODUCT', 'SERVICE']);
export const sentimentEnum = pgEnum('sentiment', ['POSITIVE', 'NEUTRAL', 'NEGATIVE']);

// ============================================================================
// TENANTS (SME Business Owners - Your Customers)
// ============================================================================
export const tenants = pgTable('tenants', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }), // Nullable for Google-only users

    // Google OAuth fields
    googleId: varchar('google_id', { length: 255 }),
    avatarUrl: text('avatar_url'),

    businessName: varchar('business_name', { length: 255 }),
    role: userRoleEnum('role').default('CUSTOMER').notNull(),
    status: tenantStatusEnum('status').default('TRIAL').notNull(),  // Default to TRIAL for new users

    // Onboarding Fields
    businessType: businessTypeEnum('business_type').default('PRODUCT').notNull(),
    preferences: jsonb('preferences').default({}).notNull(),
    onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),

    // Subscription Management
    subscriptionPlan: subscriptionPlanEnum('subscription_plan').default('FREE'),
    trialEndsAt: timestamp('trial_ends_at'),  // Set to createdAt + 7 days on registration

    createdAt: timestamp('created_at').defaultNow(),
    lastLoginAt: timestamp('last_login_at'),

    // AI Settings
    language: varchar('language', { length: 10 }).default('en').notNull(), // 'en', 'ne', 'hi'
});

export type Tenant = typeof tenants.$inferSelect;

// ============================================================================
// CONNECTED ACCOUNTS (OAuth tokens for social platforms)
// ============================================================================
export const connectedAccounts = pgTable('connected_accounts', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    platform: platformEnum('platform').notNull(),
    platformUserId: varchar('platform_user_id', { length: 255 }).notNull(),
    platformUsername: varchar('platform_username', { length: 255 }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    lastSyncedAt: timestamp('last_synced_at'),
}, (table) => [
    uniqueIndex('connected_tenant_platform_idx').on(table.tenantId, table.platform),
]);

// ============================================================================
// POSTS (Social media posts created by tenants)
// ============================================================================
export const posts = pgTable('posts', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    platform: platformEnum('platform').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    url: varchar('url', { length: 512 }).notNull(),
    imageUrl: varchar('image_url', { length: 512 }),
    caption: text('caption'),
    likes: integer('likes').default(0),
    shares: integer('shares').default(0),
    commentsCount: integer('comments_count').default(0),
    postedAt: timestamp('posted_at'),
    syncedAt: timestamp('synced_at').defaultNow(),
}, (table) => [
    index('post_tenant_idx').on(table.tenantId),
    uniqueIndex('post_platform_external_idx').on(table.platform, table.externalId),
]);

export type Post = typeof posts.$inferSelect;

// ============================================================================
// OFFERINGS (Products or Services sold by tenants)
// ============================================================================
export const offerings = pgTable('offerings', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),

    // Type: Product or Service
    type: offeringTypeEnum('type').default('PRODUCT').notNull(),

    // Optional link to a post (services may not be tied to posts)
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),

    // Core fields
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Pricing
    price: varchar('price', { length: 50 }),          // "Rs. 2,500" or "Rs. 500/hr"
    priceType: priceTypeEnum('price_type').default('FIXED'),

    // Availability
    isAvailable: boolean('is_available').default(true),

    // Keywords for AI matching (e.g., ["momo", "catering", "100 plates"])
    keywords: text('keywords').array(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('offering_tenant_idx').on(table.tenantId),
    index('offering_post_idx').on(table.postId),
    index('offering_type_idx').on(table.tenantId, table.type),
]);

export type Offering = typeof offerings.$inferSelect;
// Backward compatibility alias
export type Product = Offering;



// ============================================================================
// CUSTOMERS (Unified identity across channels - formerly user_profiles)
// ============================================================================
export const customers = pgTable('customers', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),

    // Primary display info
    displayName: varchar('display_name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),

    // Linked platform accounts (cross-channel identity)
    instagramUsername: varchar('instagram_username', { length: 255 }),
    facebookUserId: varchar('facebook_user_id', { length: 255 }),
    whatsappPhone: varchar('whatsapp_phone', { length: 50 }),
    tiktokUsername: varchar('tiktok_username', { length: 255 }),

    // Aggregated lead data
    totalLeadScore: integer('total_lead_score').default(0),
    lastIntent: varchar('last_intent', { length: 50 }),
    status: leadStatusEnum('status').default('COLD'),
    totalInteractions: integer('total_interactions').default(0),
    lastInteractionAt: timestamp('last_interaction_at'),

    tags: text('tags').array(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('customer_tenant_idx').on(table.tenantId),
    index('customer_ig_idx').on(table.tenantId, table.instagramUsername),
    index('customer_fb_idx').on(table.tenantId, table.facebookUserId),
    index('customer_wa_idx').on(table.tenantId, table.whatsappPhone),
    index('customer_score_idx').on(table.tenantId, table.totalLeadScore),
]);

export type Customer = typeof customers.$inferSelect;

// ============================================================================
// INTERACTIONS (Comments/DMs from leads on posts)
// ============================================================================
export const interactions = pgTable('interactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),

    // Direct post link (for comments, likes)
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),

    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }), // Updated from userProfileId

    // Offering being discussed (matched by AI/keywords)
    offeringId: uuid('offering_id').references(() => offerings.id, { onDelete: 'set null' }),

    // Interaction details
    platform: platformEnum('platform').notNull(),
    type: interactionTypeEnum('type').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    senderUsername: varchar('sender_username', { length: 255 }).notNull(),
    contentText: text('content_text').notNull(),
    receivedAt: timestamp('received_at').notNull(),

    // Post reference for DMs (e.g., WhatsApp messages mentioning a post)
    postReference: varchar('post_reference', { length: 512 }),

    // Cross-platform source tracking (where lead originally came from)
    sourceChannel: platformEnum('source_channel'),     // Original platform (e.g., INSTAGRAM)
    sourcePostId: uuid('source_post_id').references(() => posts.id, { onDelete: 'set null' }), // Original post

    // Status flags
    isReplied: boolean('is_replied').default(false),
    flagUrgent: boolean('flag_urgent').default(false),

    // Reply fields
    replyText: text('reply_text'),
    repliedAt: timestamp('replied_at'),

    // AI analysis
    aiIntent: aiIntentEnum('ai_intent'),
    aiConfidence: integer('ai_confidence'),
    aiSuggestion: text('ai_suggestion'),
    sentiment: sentimentEnum('sentiment'),
    flagLowConfidence: boolean('flag_low_confidence').default(false),
    isSpam: boolean('is_spam').default(false),

    // Analytics
    leadScoreChange: integer('lead_score_change').default(0),
}, (table) => [
    index('interaction_tenant_idx').on(table.tenantId),
    index('interaction_post_idx').on(table.postId),

    index('interaction_customer_idx').on(table.customerId),
    index('interaction_offering_idx').on(table.offeringId),
    index('interaction_source_channel_idx').on(table.sourceChannel),
    uniqueIndex('interaction_platform_external_idx').on(table.platform, table.externalId),
    index('interaction_received_at_idx').on(table.receivedAt),
    // PERFORMANCE: High-throughput composite indexes for Dashboard Overview
    index('interaction_tenant_replied_idx').on(table.tenantId, table.isReplied),
    index('interaction_tenant_received_at_idx').on(table.tenantId, table.receivedAt),
    // OPTIMIZATION: Critical indexes for new flow (Detail View & Filtered Stream)
    index('interaction_tenant_sender_idx').on(table.tenantId, table.senderUsername),
    index('interaction_tenant_platform_time_idx').on(table.tenantId, table.platform, desc(table.receivedAt)),
    // PRIORITY STREAM: Efficiently fetch high-intent items regardless of time
    index('interaction_tenant_intent_idx').on(table.tenantId, table.aiIntent),
]);

export type Interaction = typeof interactions.$inferSelect;

// ============================================================================
// REPLY TEMPLATES
// ============================================================================
export const replyTemplates = pgTable('reply_templates', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// API KEYS
// ============================================================================
export const apiKeys = pgTable('api_keys', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    keyPreview: varchar('key_preview', { length: 20 }).notNull(),
    scopes: text('scopes').array().default([]).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('api_key_tenant_idx').on(table.tenantId),
    uniqueIndex('api_key_hash_idx').on(table.keyHash),
]);

export type ApiKey = typeof apiKeys.$inferSelect;

// ============================================================================
// WEBHOOKS
// ============================================================================
export const webhooks = pgTable('webhooks', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    url: varchar('url', { length: 512 }).notNull(),
    secret: varchar('secret', { length: 255 }).notNull(),
    events: text('events').array().default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastDeliveryAt: timestamp('last_delivery_at'),
    failureCount: integer('failure_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('webhook_tenant_idx').on(table.tenantId),
]);

export type Webhook = typeof webhooks.$inferSelect;

// ============================================================================
// AUDIT LOGS (Immutable)
// ============================================================================
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: varchar('entity_id', { length: 255 }),
    details: jsonb('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    index('audit_log_tenant_idx').on(table.tenantId),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_created_at_idx').on(table.createdAt),
]);


export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================================================
// SYSTEM SETTINGS (Global Config for Admin)
// ============================================================================



// ============================================================================
// ANALYTICS CACHE (Materialized Counts for Dashboard)
// ============================================================================
export const systemSettings = pgTable('system_settings', {
    key: varchar('key', { length: 100 }).primaryKey(),
    value: text('value').notNull(),
    category: varchar('category', { length: 50 }).default('SYSTEM'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

export const tenantStats = pgTable('tenant_stats', {
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).primaryKey(),

    // Core Counters (Fast Access)
    totalInteractions: integer('total_interactions').default(0).notNull(),
    totalLeads: integer('total_leads').default(0).notNull(),
    unansweredCount: integer('unanswered_count').default(0).notNull(),

    // Automated JSON Buckets
    platformCounts: jsonb('platform_counts').default({}).notNull(),
    typeCounts: jsonb('type_counts').default({}).notNull(),
    intentCounts: jsonb('intent_counts').default({}).notNull(),

    lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
});

export type TenantStats = typeof tenantStats.$inferSelect;
