import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, onboardingSchema } from '@allinbox/validators';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { GoogleOAuthService, GoogleOAuthState } from '../services/google-oauth.service.js';

// DEPRECATED: Sign up via Supabase Client
export const register = async (req: Request, res: Response) => {
    try {
        await AuthService.register(req.body);
    } catch (error: any) {
        res.status(410).json({ error: error.message });
    }
};

// DEPRECATED: Sign in via Supabase Client
export const login = async (req: Request, res: Response) => {
    try {
        await AuthService.login(req.body);
    } catch (error: any) {
        res.status(410).json({ error: error.message });
    }
};

// DEPRECATED: Sign out via Supabase Client
export const logout = (req: Request, res: Response) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Use supabase.auth.signOut() on frontend' });
};

// GET /api/auth/me - Validate session and return current user
export const me = async (req: Request, res: Response) => {
    try {
        const { userId, email } = res.locals.user as { userId: string; email?: string };

        /* OLD FETCH LOGIC
        const [tenant] = await db.select({
            id: tenants.id,
            email: tenants.email,
            status: tenants.status,
            role: tenants.role,
        }).from(tenants).where(eq(tenants.id, userId)).limit(1);

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        */

        const tenant = await AuthService.syncUser(userId, email);

        if (!tenant) {
            return res.status(404).json({ error: 'User not found or sync failed' });
        }

        res.json({ user: tenant });
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

// DEPRECATED: Initiate Google OAuth via Supabase
export const initiateGoogleAuth = (req: Request, res: Response) => {
    res.status(410).json({ error: 'Use supabase.auth.signInWithOAuth({ provider: "google" }) on frontend' });
};

// DEPRECATED: Google OAuth Callback handled by Supabase
export const handleGoogleCallback = async (req: Request, res: Response) => {
    res.status(410).json({ error: 'Auth callback is now handled client-side by Supabase' });
};


