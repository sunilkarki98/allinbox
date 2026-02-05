import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, onboardingSchema } from '@allinbox/validators';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { GoogleOAuthService, GoogleOAuthState } from '../services/google-oauth.service.js';

export const register = async (req: Request, res: Response) => {
    try {
        const data = registerSchema.parse(req.body);
        const result = await AuthService.register(data); // Use validated data, not raw body

        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Hardened SameSite
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({ user: result.user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        if (error instanceof Error && (error.message === 'User already exists' || error.message === 'Tenant already exists')) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await AuthService.login(data);

        // Set HttpOnly Cookie
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Hardened SameSite
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ user: result.user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        if (error instanceof Error && error.message === 'Invalid credentials') {
            return res.status(401).json({ error: error.message });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    res.json({ message: 'Logged out' });
};

// GET /api/auth/me - Validate session and return current user
export const me = async (req: Request, res: Response) => {
    try {
        const { userId } = res.locals.user as { userId: string };

        const [tenant] = await db.select({
            id: tenants.id,
            email: tenants.email,
            status: tenants.status,
            role: tenants.role,
        }).from(tenants).where(eq(tenants.id, userId)).limit(1);

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Return actual DB role so frontend AuthContext works correctly (requires SUPER_ADMIN)
        const user = tenant;

        res.json({ user });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// OPTIONS /api/auth/profile - Update tenant profile settings
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { userId } = res.locals.user as { userId: string };
        const { language, businessName } = req.body;

        const [updatedTenant] = await db.update(tenants)
            .set({
                ...(language && { language }),
                ...(businessName && { businessName })
            })
            .where(eq(tenants.id, userId))
            .returning();

        if (!updatedTenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        res.json({ user: updatedTenant });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/auth/onboarding/complete - Complete tenant onboarding
export const completeOnboarding = async (req: Request, res: Response) => {
    try {
        const { userId } = res.locals.user as { userId: string };
        const data = onboardingSchema.parse(req.body);

        const updatedTenant = await AuthService.completeOnboarding(userId, data);

        res.json({ user: updatedTenant });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        if (error instanceof Error && error.message === 'Tenant not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Onboarding complete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/auth/google - Initiate Google OAuth
export const initiateGoogleAuth = (req: Request, res: Response) => {
    try {
        if (!GoogleOAuthService.isConfigured()) {
            return res.status(503).json({ error: 'Google OAuth not configured' });
        }

        const state: GoogleOAuthState = {
            nonce: GoogleOAuthService.generateStateNonce(),
            redirectTo: req.query.redirect as string || '/dashboard',
        };

        // Store nonce in cookie for CSRF protection
        res.cookie('google_auth_nonce', state.nonce, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 10 * 60 * 1000 // 10 minutes
        });

        const authUrl = GoogleOAuthService.getAuthUrl(state);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Google Auth Init Error:', error);
        res.redirect('/login?error=auth_init_failed');
    }
};

// GET /api/auth/callback/google - Handle Google OAuth callback
export const handleGoogleCallback = async (req: Request, res: Response) => {
    try {
        const { code, state: encodedState, error } = req.query;

        if (error) {
            console.error('Google OAuth Error:', error);
            return res.redirect('/login?error=google_auth_failed');
        }

        if (!code || !encodedState) {
            return res.redirect('/login?error=missing_params');
        }

        const state = GoogleOAuthService.decodeState(encodedState as string);
        if (!state) {
            return res.redirect('/login?error=invalid_state');
        }

        // Verify nonce
        const storedNonce = req.cookies.google_auth_nonce;
        if (!storedNonce || storedNonce !== state.nonce) {
            return res.redirect('/login?error=csrf_mismatch');
        }

        res.clearCookie('google_auth_nonce');

        // Exchange code for tokens
        const tokens = await GoogleOAuthService.exchangeCodeForTokens(code as string);

        // Get user info
        const googleUser = await GoogleOAuthService.getUserInfo(tokens.access_token);

        // Login or Register
        const result = await AuthService.loginOrRegisterWithGoogle(googleUser);

        // Set Session Cookie
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.redirect(state.redirectTo || '/dashboard');
    } catch (error) {
        console.error('Google Callback Error:', error);
        res.redirect('/login?error=login_failed');
    }
};


