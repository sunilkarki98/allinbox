import { db } from '../db/index.js';
import { systemSettings, SystemSetting } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption.js';

export class SystemSettingsService {
    static async get(key: string): Promise<string | null> {
        const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
        const value = result[0]?.value || null;

        if (!value) return null;

        // Try to decrypt if it looks like an encrypted value (iv:tag:blob)
        if (value.includes(':') && value.split(':').length === 3) {
            try {
                return decrypt(value);
            } catch (e) {
                // If decryption fails, it might be a plaintext value that happens to have colons
                // Or use an old key, we return it as is (fallback)
                return value;
            }
        }

        return value;
    }

    static async set(key: string, value: string, category: string = 'SYSTEM'): Promise<SystemSetting> {
        const [setting] = await db.insert(systemSettings)
            .values({ key, value, category })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value, updatedAt: new Date() }
            })
            .returning();
        return setting;
    }

    static async getAll(): Promise<SystemSetting[]> {
        return db.select().from(systemSettings);
    }

    // Helper for specific keys
    static async getOpenAIKey(): Promise<string | null> {
        // Check DB first
        const dbKey = await this.get('OPENAI_API_KEY');
        if (dbKey) return dbKey;

        // Fallback to Env
        return process.env.OPENAI_API_KEY || null;
    }
}
