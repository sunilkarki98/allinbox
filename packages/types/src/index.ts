/**
 * @allinbox/types
 * 
 * Pure TypeScript types with zero runtime dependencies.
 * These types are inferred from the database schema for consistency.
 */

// ============================================================================
// ENUMS (as TypeScript types, not runtime enums)
// ============================================================================
export type Platform = 'TIKTOK' | 'INSTAGRAM' | 'WHATSAPP' | 'FACEBOOK';
export type InteractionType = 'COMMENT' | 'DM' | 'LIKE' | 'SHARE';
export type UserRole = 'CUSTOMER' | 'SUPER_ADMIN';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
export type SubscriptionPlan = 'FREE' | 'PAID';
export type LeadStatus = 'COLD' | 'WARM' | 'HOT' | 'CONVERTED';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type AIIntent = 'purchase_intent' | 'pricing_inquiry' | 'shipping_inquiry' | 'support_issue' | 'general' | 'spam';

// ============================================================================
// ENTITY TYPES
// ============================================================================

export interface Tenant {
    id: string;
    email: string;
    passwordHash: string;
    businessName: string | null;
    role: UserRole;
    status: TenantStatus;
    subscriptionPlan: SubscriptionPlan | null;
    trialEndsAt: Date | null;
    createdAt: Date | null;
    lastLoginAt: Date | null;
}

export interface ConnectedAccount {
    id: string;
    tenantId: string;
    platform: Platform;
    platformUserId: string;
    platformUsername: string | null;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    lastSyncedAt: Date | null;
}

export interface Post {
    id: string;
    tenantId: string;
    platform: Platform;
    externalId: string;
    url: string;
    imageUrl: string | null;
    caption: string | null;
    likes: number | null;
    shares: number | null;
    commentsCount: number | null;
    postedAt: Date | null;
    syncedAt: Date | null;
}

export interface Product {
    id: string;
    tenantId: string;
    postId: string | null;
    name: string;
    price: string | null;
    description: string | null;
    isAvailable: boolean | null;
    createdAt: Date | null;
}

export interface Customer {
    id: string;
    tenantId: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;

    // Linked Accounts
    instagramUsername: string | null;
    facebookUserId: string | null;
    whatsappPhone: string | null;
    tiktokUsername: string | null;

    // Aggregated Data
    totalLeadScore: number | null;
    lastIntent: string | null;
    status: LeadStatus;
    totalInteractions: number | null;
    lastInteractionAt: Date | null;
    tags: string[] | null;
    notes: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export interface Interaction {
    id: string;
    tenantId: string;
    postId: string | null;
    customerId: string | null;
    platform: Platform;
    type: InteractionType;
    externalId: string;
    senderUsername: string;
    contentText: string;
    receivedAt: Date;
    isReplied: boolean | null;
    flagUrgent: boolean | null;
    replyText: string | null;
    repliedAt: Date | null;
    aiIntent: string | null;
    aiConfidence: number | null;
    aiSuggestion: string | null;
    sentiment: string | null;
    flagLowConfidence: boolean | null;
    isSpam: boolean | null;
}

export interface ApiKey {
    id: string;
    tenantId: string;
    name: string;
    keyHash: string;
    keyPreview: string;
    scopes: string[];
    lastUsedAt: Date | null;
    createdAt: Date | null;
}

export interface Webhook {
    id: string;
    tenantId: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    lastDeliveryAt: Date | null;
    failureCount: number;
    createdAt: Date | null;
}

export interface AuditLog {
    id: string;
    tenantId: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}

export interface SystemSetting {
    key: string;
    value: string;
    category: string;
    updatedAt: Date | null;
}

// ============================================================================
// AI TYPES
// ============================================================================

export interface AIAnalysisResult {
    intent: AIIntent;
    confidence: number;
    suggestion: string;
    sentiment: Sentiment;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface AuthUser {
    userId: string;
    role: UserRole;
}
