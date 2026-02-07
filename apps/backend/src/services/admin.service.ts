import { db } from '../db/index.js';
import { tenants, systemSettings, auditLogs } from '@allinbox/db';
import { eq, desc, count, sql } from 'drizzle-orm';
import { CredentialService } from './credential.service.js';
import { redis } from '../utils/redis.js';
import { encrypt } from '../utils/encryption.js';

export class AdminService {
    // List all customers
    static async getAllTenants(page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;

            // Use window function to get total count in ONE query
            const fullData = await db.select({
                id: tenants.id,
                email: tenants.email,
                businessName: tenants.businessName,
                status: tenants.status,
                subscriptionPlan: tenants.subscriptionPlan,
                trialEndsAt: tenants.trialEndsAt,
                createdAt: tenants.createdAt,
                lastLoginAt: tenants.lastLoginAt,
                totalCount: sql<number>`count(*) OVER()`
            })
                .from(tenants)
                .orderBy(desc(tenants.createdAt))
                .limit(limit)
                .offset(offset);

            const totalCount = fullData[0]?.totalCount || 0;
            // Remove totalCount from individual records for the response data
            const data = fullData.map(({ totalCount, ...rest }) => rest);

            return {
                data,
                meta: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Update customer status
    static async updateTenantStatus(tenantId: string, status: 'ACTIVE' | 'SUSPENDED') {
        const [updated] = await db.update(tenants)
            .set({ status })
            .where(eq(tenants.id, tenantId))
            .returning({ id: tenants.id, status: tenants.status });

        if (updated) {
            // Invalidate status cache to enforce change immediately
            await redis.del(`user:status:${tenantId}`);
        }

        return updated;
    }

    // Promote tenant from FREE to PAID
    static async promoteTenant(tenantId: string) {
        const [updated] = await db.update(tenants)
            .set({
                subscriptionPlan: 'PAID',
                status: 'ACTIVE'  // Activate them when promoted
            })
            .where(eq(tenants.id, tenantId))
            .returning({
                id: tenants.id,
                subscriptionPlan: tenants.subscriptionPlan,
                status: tenants.status
            });

        if (updated) {
            await redis.del(`user:status:${tenantId}`);
        }

        return updated;
    }

    // Extend trial by N days
    static async extendTrial(tenantId: string, days: number) {
        // Get current tenant
        const [tenant] = await db.select({ trialEndsAt: tenants.trialEndsAt })
            .from(tenants)
            .where(eq(tenants.id, tenantId));

        if (!tenant) return null;

        const newTrialEnd = new Date(tenant.trialEndsAt || new Date());
        newTrialEnd.setDate(newTrialEnd.getDate() + days);

        const [updated] = await db.update(tenants)
            .set({
                trialEndsAt: newTrialEnd,
                status: 'TRIAL'  // Keep/restore trial status
            })
            .where(eq(tenants.id, tenantId))
            .returning({
                id: tenants.id,
                trialEndsAt: tenants.trialEndsAt,
                status: tenants.status
            });

        if (updated) {
            await redis.del(`user:status:${tenantId}`);
        }

        return updated;
    }

    // Get all system settings (MASKED)
    static async getSystemSettings() {
        const allSettings = await db.select().from(systemSettings);

        // Mask sensitive keys - never reveal any characters
        return allSettings.map(s => {
            const isSecret = s.key.includes('KEY') || s.key.includes('SECRET') || s.key.includes('TOKEN');
            if (isSecret && s.value) {
                return {
                    ...s,
                    value: '••••••••',
                    isMasked: true
                };
            }
            return s;
        });
    }

    // Allowed system settings keys (admin-only configuration)
    private static ALLOWED_SETTING_KEYS = [
        // AI Configuration
        'AI_MODEL',              // Which AI model to use (e.g., 'gemini-1.5-flash', 'gemini-1.5-pro')
        'GEMINI_API_KEY',        // Gemini API key

        // Social Platform Credentials
        'TIKTOK_CLIENT_KEY',
        'TIKTOK_CLIENT_SECRET',
        'INSTAGRAM_CLIENT_ID',
        'INSTAGRAM_CLIENT_SECRET',
        'FACEBOOK_APP_ID',
        'FACEBOOK_APP_SECRET',
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_ACCESS_TOKEN',

        // Webhook Configuration
        'WEBHOOK_URL',
        'WEBHOOK_SECRET'
    ];

    // Update or create a system setting
    static async updateSystemSetting(key: string, value: string, category: string = 'SYSTEM') {
        // 0. Strict Allow-list check
        if (!this.ALLOWED_SETTING_KEYS.includes(key)) {
            throw new Error(`Unauthorized setting key: ${key}`);
        }

        // 1. Validate (if it's a known credential type)
        const validation = await CredentialService.validate(key, value);
        if (!validation.isValid) {
            throw new Error(validation.error || 'Invalid credential');
        }

        // 2. Encrypt if it's a secret
        let valueToStore = value;
        const isSecret = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN');
        if (isSecret && value) {
            valueToStore = encrypt(value);
        }

        const [updated] = await db.insert(systemSettings)
            .values({ key, value: valueToStore, category })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value: valueToStore, updatedAt: new Date(), category }
            })
            .returning();

        return updated;
    }
}
