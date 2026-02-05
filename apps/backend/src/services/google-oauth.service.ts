/**
 * GoogleOAuthService - OAuth 2.0 Implementation for Google Sign-In
 * 
 * Handles Google OAuth flow for user authentication.
 */

import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GoogleOAuthState {
    nonce: string;
    redirectTo?: string;
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
}

export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token?: string;
    refresh_token?: string;
}

export class GoogleOAuthService {
    private static clientId = process.env.GOOGLE_CLIENT_ID;
    private static clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    private static redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback/google';

    /**
     * Generate Google OAuth authorization URL
     */
    static getAuthUrl(state: GoogleOAuthState): string {
        if (!this.clientId) {
            throw new Error('GOOGLE_CLIENT_ID not configured');
        }

        const encodedState = Buffer.from(JSON.stringify(state)).toString('base64url');

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent',
            state: encodedState,
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
        }

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Google token exchange failed:', error);
            throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
        }

        return await response.json();
    }

    /**
     * Get user info from Google
     */
    static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
        const response = await fetch(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get user info: ${error.error?.message || 'Unknown error'}`);
        }

        return await response.json();
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
    static decodeState(encodedState: string): GoogleOAuthState | null {
        try {
            const decoded = Buffer.from(encodedState, 'base64url').toString('utf-8');
            return JSON.parse(decoded) as GoogleOAuthState;
        } catch (error) {
            console.error('Failed to decode Google OAuth state:', error);
            return null;
        }
    }

    /**
     * Check if Google OAuth is properly configured
     */
    static isConfigured(): boolean {
        return !!(this.clientId && this.clientSecret);
    }
}
