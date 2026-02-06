import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getJWTSecret, JWT_EXPIRY } from '../utils/jwt.js';
import { registerSchema, loginSchema, onboardingSchema } from '@allinbox/validators';
import { GoogleUserInfo } from './google-oauth.service.js';

export class AuthService {
    private static SALT_ROUNDS = 12; // Increased from 10 for better security

    /**
     * @deprecated Legacy custom registration. Users should sign up via Supabase.
     */
    static async register(data: z.infer<typeof registerSchema>) {
        console.warn('AuthService.register is deprecated. Use Supabase Auth.');
        throw new Error('Please sign up via Supabase');
    }

    /**
     * @deprecated Legacy custom login. Users should sign in via Supabase.
     */
    static async login(data: z.infer<typeof loginSchema>) {
        console.warn('AuthService.login is deprecated. Use Supabase Auth.');
        throw new Error('Please sign in via Supabase');
    }

    /**
     * @deprecated Legacy Google OAuth. Users should use Supabase Google Auth.
     */
    static async loginOrRegisterWithGoogle(googleUser: GoogleUserInfo) {
        console.warn('AuthService.loginOrRegisterWithGoogle is deprecated. Use Supabase Google Auth.');
        throw new Error('Please use Supabase Google Auth');
    }

    static async completeOnboarding(userId: string, data: z.infer<typeof onboardingSchema>) {
        const [updatedTenant] = await db.update(tenants)
            .set({
                businessName: data.businessName,
                businessType: data.businessType,
                onboardingCompleted: true,
            })
            .where(eq(tenants.id, userId))
            .returning();

        if (!updatedTenant) {
            throw new Error('Tenant not found');
        }

        return updatedTenant;
    }

    /**
     * Primary integration point: Ensures a matching Tenant record exists in our DB
     * for a Supabase User.
     */
    static async syncUser(userId: string, email?: string) {
        // 1. Check if tenant exists
        const [existingTenant] = await db.select().from(tenants).where(eq(tenants.id, userId)).limit(1);

        if (existingTenant) {
            return existingTenant;
        }

        // 2. If not found and we have an email, auto-create the record
        // This handles both first-time logins and trigger delays.
        if (email) {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);

            try {
                const [newTenant] = await db.insert(tenants).values({
                    id: userId,
                    email: email,
                    status: 'TRIAL',
                    subscriptionPlan: 'FREE',
                    trialEndsAt,
                    onboardingCompleted: false
                })
                    .onConflictDoNothing() // Handle race conditions with triggers
                    .returning();

                if (newTenant) {
                    console.log(`Successfully synced/created tenant for user: ${userId}`);
                    return newTenant;
                }

                // If onConflictDoNothing prevented insert, re-fetch
                const [refetched] = await db.select().from(tenants).where(eq(tenants.id, userId)).limit(1);
                return refetched || null;

            } catch (err) {
                console.error('Failed to sync user in DB:', err);
                return null;
            }
        }

        return null;
    }

    /**
     * @deprecated No longer needed as we use Supabase JWTs strictly.
     */
    private static generateToken(tenantId: string) {
        return 'DEPRECATED';
    }
}

