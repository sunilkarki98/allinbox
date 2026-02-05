/**
 * MetaOAuthService - OAuth 2.0 Implementation for Meta Platforms
 * 
 * Handles OAuth flows for Instagram, Facebook, and WhatsApp Business API.
 * Uses Meta Graph API v18.0 for token exchange and account management.
 */

import { PlatformType } from './platform.service.js';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Meta Graph API version
const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// OAuth scopes per platform
const PLATFORM_SCOPES: Record<string, string[]> = {
    INSTAGRAM: [
        'instagram_basic',
        'instagram_manage_comments',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'business_management'
    ],
    FACEBOOK: [
        'pages_messaging',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_show_list',
        'business_management'
    ],
    WHATSAPP: [
        'whatsapp_business_messaging',
        'whatsapp_business_management',
        'business_management'
    ]
};

export interface OAuthState {
    tenantId: string;
    platform: PlatformType;
    nonce: string;
    redirectTo?: string;
}

export interface TokenResponse {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
    expiresAt?: Date;
}

export interface ConnectedAccountData {
    platformUserId: string;
    platformUsername?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    pageId?: string;        // For Facebook Pages
    igBusinessId?: string;  // For Instagram Business Account
}

export class MetaOAuthService {


    private static appId = process.env.META_APP_ID;
    private static appSecret = process.env.META_APP_SECRET;
    private static redirectBaseUrl = process.env.META_REDIRECT_BASE_URL || `${env.API_URL}/api/platforms/callback`;

    /**
     * Generate OAuth authorization URL for a platform
     */
    static getAuthUrl(platform: PlatformType, state: OAuthState): string {
        if (!this.appId) {
            throw new Error('META_APP_ID not configured');
        }

        const scopes = PLATFORM_SCOPES[platform];
        if (!scopes) {
            throw new Error(`Unsupported platform for OAuth: ${platform}`);
        }

        // Encode state as base64 JSON for security
        const encodedState = Buffer.from(JSON.stringify(state)).toString('base64url');

        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: `${this.redirectBaseUrl}/${platform.toLowerCase()}`,
            scope: scopes.join(','),
            response_type: 'code',
            state: encodedState,
        });

        // Instagram uses Facebook OAuth dialog
        return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    static async exchangeCodeForToken(platform: PlatformType, code: string): Promise<TokenResponse> {
        if (!this.appId || !this.appSecret) {
            throw new Error('META_APP_ID or META_APP_SECRET not configured');
        }

        const params = new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: `${this.redirectBaseUrl}/${platform.toLowerCase()}`,
            code: code,
        });

        const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('Token exchange failed:', error);
            throw new Error(`Token exchange failed: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        return {
            accessToken: data.access_token,
            tokenType: data.token_type || 'bearer',
            expiresIn: data.expires_in,
            expiresAt: data.expires_in
                ? new Date(Date.now() + data.expires_in * 1000)
                : undefined
        };
    }

    /**
     * Exchange short-lived token for long-lived token (60 days)
     */
    static async getLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
        if (!this.appId || !this.appSecret) {
            throw new Error('META_APP_ID or META_APP_SECRET not configured');
        }

        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
        });

        const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Long-lived token exchange failed: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        // Long-lived tokens typically expire in 60 days
        const expiresIn = data.expires_in || 60 * 24 * 60 * 60; // Default 60 days

        return {
            accessToken: data.access_token,
            tokenType: data.token_type || 'bearer',
            expiresIn: expiresIn,
            expiresAt: new Date(Date.now() + expiresIn * 1000)
        };
    }

    /**
     * Get user profile and connected accounts info
     */
    static async getUserAccountData(
        platform: PlatformType,
        accessToken: string
    ): Promise<ConnectedAccountData> {
        // Get basic user info
        const meResponse = await fetch(
            `${GRAPH_API_BASE}/me?fields=id,name&access_token=${accessToken}`
        );

        if (!meResponse.ok) {
            const error = await meResponse.json();
            throw new Error(`Failed to get user info: ${error.error?.message || 'Unknown error'}`);
        }

        const meData = await meResponse.json();

        const accountData: ConnectedAccountData = {
            platformUserId: meData.id,
            platformUsername: meData.name,
            accessToken: accessToken,
        };

        if (platform === 'INSTAGRAM') {
            // Get Instagram Business Account linked to Pages
            const pagesResponse = await fetch(
                `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
            );

            if (pagesResponse.ok) {
                const pagesData = await pagesResponse.json();
                const pageWithIG = pagesData.data?.find((p: any) => p.instagram_business_account);

                if (pageWithIG) {
                    accountData.pageId = pageWithIG.id;
                    accountData.igBusinessId = pageWithIG.instagram_business_account.id;

                    // Get Instagram username
                    const igResponse = await fetch(
                        `${GRAPH_API_BASE}/${pageWithIG.instagram_business_account.id}?fields=username&access_token=${accessToken}`
                    );
                    if (igResponse.ok) {
                        const igData = await igResponse.json();
                        accountData.platformUsername = igData.username;
                        accountData.platformUserId = pageWithIG.instagram_business_account.id;
                    }
                }
            }
        } else if (platform === 'FACEBOOK') {
            // Get Facebook Pages
            const pagesResponse = await fetch(
                `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
            );

            if (pagesResponse.ok) {
                const pagesData = await pagesResponse.json();
                const firstPage = pagesData.data?.[0];

                if (firstPage) {
                    accountData.pageId = firstPage.id;
                    accountData.platformUsername = firstPage.name;
                    // Use page access token for page-level operations
                    accountData.accessToken = firstPage.access_token || accessToken;
                }
            }
        }

        return accountData;
    }

    /**
     * Generate a secure state nonce for CSRF protection
     */
    static generateStateNonce(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Decode and validate OAuth state
     */
    static decodeState(encodedState: string): OAuthState | null {
        try {
            const decoded = Buffer.from(encodedState, 'base64url').toString('utf-8');
            return JSON.parse(decoded) as OAuthState;
        } catch (error) {
            console.error('Failed to decode OAuth state:', error);
            return null;
        }
    }

    /**
     * Check if Meta OAuth is properly configured
     */
    static isConfigured(): boolean {
        return !!(this.appId && this.appSecret);
    }

    /**
     * Refresh an expired token (for Facebook/Instagram)
     * Note: This only works for long-lived tokens that haven't fully expired
     */
    static async refreshToken(token: string): Promise<TokenResponse | null> {
        try {
            // For Facebook/Instagram, we can exchange long-lived for another long-lived
            // This only works if the token hasn't fully expired
            return await this.getLongLivedToken(token);
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        }
    }
}
