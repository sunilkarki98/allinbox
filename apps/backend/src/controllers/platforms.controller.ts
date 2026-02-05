import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { connectedAccounts } from '@allinbox/db';
import { encrypt } from '../utils/encryption.js';
import { NextFunction, Request, Response } from 'express';
import { MetaOAuthService, OAuthState } from '../services/meta-oauth.service.js';
import { PlatformType } from '../services/platform.service.js';

const connectSchema = z.object({
    platform: z.enum(['TIKTOK', 'INSTAGRAM', 'WHATSAPP', 'FACEBOOK']),
});

const platformParamSchema = z.object({
    platform: z.enum(['instagram', 'facebook', 'whatsapp']),
});

/**
 * List all connected accounts for the tenant
 */
export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = res.locals.user.userId;
        // SECURITY: Explicitly exclude sensitive tokens from the response
        const accounts = await db.select({
            id: connectedAccounts.id,
            platform: connectedAccounts.platform,
            platformUserId: connectedAccounts.platformUserId,
            platformUsername: connectedAccounts.platformUsername,
            lastSyncedAt: connectedAccounts.lastSyncedAt,
            tokenExpiresAt: connectedAccounts.tokenExpiresAt,
        }).from(connectedAccounts).where(eq(connectedAccounts.tenantId, tenantId));

        res.json({ accounts });
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate OAuth flow - redirects user to Meta OAuth dialog
 */
export const initiateOAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = res.locals.user.userId;
        const { platform } = platformParamSchema.parse({ platform: req.params.platform });
        const platformUpper = platform.toUpperCase() as PlatformType;

        // Check if Meta OAuth is configured
        if (!MetaOAuthService.isConfigured()) {
            return res.status(503).json({
                error: 'OAuth not configured',
                message: 'META_APP_ID and META_APP_SECRET must be set in environment variables'
            });
        }

        // Check if already connected
        const existing = await db.select().from(connectedAccounts).where(
            and(
                eq(connectedAccounts.tenantId, tenantId),
                eq(connectedAccounts.platform, platformUpper)
            )
        ).limit(1);

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Platform already connected' });
        }

        // Generate state with CSRF nonce
        const state: OAuthState = {
            tenantId,
            platform: platformUpper,
            nonce: MetaOAuthService.generateStateNonce(),
            redirectTo: req.query.redirect as string || '/dashboard/settings',
        };

        // Store nonce in session/cache for verification (simplified: using cookie here)
        res.cookie('oauth_nonce', state.nonce, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 10 * 60 * 1000 // 10 minutes
        });

        const authUrl = MetaOAuthService.getAuthUrl(platformUpper, state);

        // Redirect to Meta OAuth dialog
        res.redirect(authUrl);
    } catch (error) {
        next(error);
    }
};

/**
 * Handle OAuth callback from Meta
 */
export const handleOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { platform } = platformParamSchema.parse({ platform: req.params.platform });
        const platformUpper = platform.toUpperCase() as PlatformType;

        const { code, state: encodedState, error: oauthError, error_description } = req.query;

        // Handle OAuth errors
        if (oauthError) {
            console.error('OAuth error:', oauthError, error_description);
            return res.redirect(`/dashboard/settings?error=${encodeURIComponent(oauthError as string)}`);
        }

        if (!code || !encodedState) {
            return res.redirect('/dashboard/settings?error=missing_params');
        }

        // Decode and validate state
        const state = MetaOAuthService.decodeState(encodedState as string);
        if (!state) {
            return res.redirect('/dashboard/settings?error=invalid_state');
        }

        // Verify nonce (CSRF protection)
        const storedNonce = req.cookies?.oauth_nonce;
        if (!storedNonce || storedNonce !== state.nonce) {
            console.error('Nonce mismatch:', { stored: storedNonce, received: state.nonce });
            return res.redirect('/dashboard/settings?error=csrf_mismatch');
        }

        // Clear the nonce cookie
        res.clearCookie('oauth_nonce');

        const tenantId = state.tenantId;

        // Exchange code for token
        const tokenResponse = await MetaOAuthService.exchangeCodeForToken(platformUpper, code as string);

        // Get long-lived token (60 days)
        const longLivedToken = await MetaOAuthService.getLongLivedToken(tokenResponse.accessToken);

        // Get account data
        const accountData = await MetaOAuthService.getUserAccountData(platformUpper, longLivedToken.accessToken);

        // Encrypt token before storage
        const encryptedToken = encrypt(longLivedToken.accessToken);

        // Check if already connected (race condition safety)
        const existing = await db.select().from(connectedAccounts).where(
            and(
                eq(connectedAccounts.tenantId, tenantId),
                eq(connectedAccounts.platform, platformUpper)
            )
        ).limit(1);

        if (existing.length > 0) {
            // Update existing connection
            await db.update(connectedAccounts)
                .set({
                    platformUserId: accountData.platformUserId,
                    platformUsername: accountData.platformUsername,
                    accessToken: encryptedToken,
                    tokenExpiresAt: longLivedToken.expiresAt,
                    lastSyncedAt: new Date(),
                })
                .where(eq(connectedAccounts.id, existing[0].id));
        } else {
            // Create new connection
            await db.insert(connectedAccounts).values({
                tenantId,
                platform: platformUpper,
                platformUserId: accountData.platformUserId,
                platformUsername: accountData.platformUsername,
                accessToken: encryptedToken,
                tokenExpiresAt: longLivedToken.expiresAt,
                lastSyncedAt: new Date(),
            });
        }

        console.log(`✅ ${platformUpper} connected for tenant ${tenantId}`);

        // Redirect back to frontend
        const redirectUrl = state.redirectTo || '/dashboard/settings';
        res.redirect(`${redirectUrl}?connected=${platform}`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`/dashboard/settings?error=connection_failed`);
    }
};

/**
 * Legacy connect endpoint - now redirects to OAuth flow
 * Kept for backwards compatibility
 */
export const connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { platform } = connectSchema.parse(req.body);
        const platformLower = platform.toLowerCase();

        // For platforms that support OAuth, redirect to OAuth flow
        if (['instagram', 'facebook'].includes(platformLower)) {
            return res.status(302).json({
                redirect: `/api/platforms/auth/${platformLower}`,
                message: 'Please use OAuth flow for this platform'
            });
        }

        // WhatsApp requires manual token setup (System User token)
        if (platform === 'WHATSAPP') {
            return res.status(400).json({
                error: 'WhatsApp requires manual setup',
                message: 'WhatsApp tokens must be generated in Meta Business Manager and configured via admin settings'
            });
        }

        // TikTok not implemented yet
        return res.status(501).json({ error: 'Platform not yet supported' });
    } catch (error) {
        next(error);
    }
};

/**
 * Disconnect a platform
 */
export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = res.locals.user.userId;
        const { platform } = connectSchema.parse(req.body);

        await db.delete(connectedAccounts).where(
            and(
                eq(connectedAccounts.tenantId, tenantId),
                eq(connectedAccounts.platform, platform)
            )
        );

        res.json({ message: 'Disconnected successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Check OAuth configuration status
 */
export const checkOAuthStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({
            configured: MetaOAuthService.isConfigured(),
            supportedPlatforms: ['INSTAGRAM', 'FACEBOOK'],
            manualSetupPlatforms: ['WHATSAPP'],
            comingSoon: ['TIKTOK']
        });
    } catch (error) {
        next(error);
    }
};
