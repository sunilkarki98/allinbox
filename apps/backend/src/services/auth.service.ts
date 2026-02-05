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

    static async register(data: z.infer<typeof registerSchema>) {
        const existingTenant = await db.select().from(tenants).where(eq(tenants.email, data.email)).limit(1);
        if (existingTenant.length > 0) {
            throw new Error('Tenant already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

        // Calculate trial end date (7 days from now)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        // Insert and return the tenant.
        const [newTenant] = await db.insert(tenants).values({
            email: data.email,
            passwordHash: hashedPassword,
            status: 'TRIAL',
            subscriptionPlan: 'FREE',
            trialEndsAt,
        }).returning({
            id: tenants.id,
            email: tenants.email,
            status: tenants.status,
            subscriptionPlan: tenants.subscriptionPlan,
            trialEndsAt: tenants.trialEndsAt
        });

        const token = this.generateToken(newTenant.id);
        // Map to "user" for frontend compatibility
        return { user: { ...newTenant, role: 'CUSTOMER' }, token };
    }

    static async login(data: z.infer<typeof loginSchema>) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.email, data.email)).limit(1);
        if (!tenant) {
            throw new Error('Invalid credentials');
        }

        // Check if user has a password (might be Google-only user)
        if (!tenant.passwordHash) {
            throw new Error('Please sign in with Google');
        }

        const isMatch = await bcrypt.compare(data.password, tenant.passwordHash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(tenant.id);
        // Map to "user" for frontend compatibility
        return { user: { id: tenant.id, email: tenant.email, role: tenant.role, status: tenant.status }, token };
    }

    /**
     * Login or register a user via Google OAuth
     * Creates account if doesn't exist, logs in if exists
     */
    static async loginOrRegisterWithGoogle(googleUser: GoogleUserInfo) {
        // Check if user exists by email
        const [existingTenant] = await db.select().from(tenants)
            .where(eq(tenants.email, googleUser.email))
            .limit(1);

        if (existingTenant) {
            // Update Google-specific fields if needed
            if (!existingTenant.googleId || !existingTenant.avatarUrl) {
                await db.update(tenants)
                    .set({
                        googleId: googleUser.id,
                        avatarUrl: googleUser.picture,
                        businessName: existingTenant.businessName || googleUser.name,
                    })
                    .where(eq(tenants.id, existingTenant.id));
            }

            const token = this.generateToken(existingTenant.id);
            return {
                user: {
                    id: existingTenant.id,
                    email: existingTenant.email,
                    role: existingTenant.role,
                    status: existingTenant.status,
                    avatarUrl: googleUser.picture,
                },
                token,
                isNewUser: false
            };
        }

        // Create new user
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        const [newTenant] = await db.insert(tenants).values({
            email: googleUser.email,
            googleId: googleUser.id,
            avatarUrl: googleUser.picture,
            businessName: googleUser.name,
            status: 'TRIAL',
            subscriptionPlan: 'FREE',
            trialEndsAt,
            // passwordHash is null for Google-only users
        }).returning({
            id: tenants.id,
            email: tenants.email,
            status: tenants.status,
            role: tenants.role,
        });

        const token = this.generateToken(newTenant.id);
        return {
            user: {
                ...newTenant,
                avatarUrl: googleUser.picture,
            },
            token,
            isNewUser: true
        };
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

    private static generateToken(tenantId: string) {
        // Keep 'userId' in payload for backward compatibility with middleware/frontend
        return jwt.sign({ userId: tenantId }, getJWTSecret(), { expiresIn: JWT_EXPIRY.ACCESS_TOKEN });
    }
}

