import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    API_URL: z.string().url().default('http://localhost:3001'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis / Dragonfly
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // Security
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    ADMIN_URL: z.string().url().default('http://localhost:3002'),
    ENCRYPTION_KEY: z.string().optional(),
    WEBHOOK_VERIFY_TOKEN: z.string().optional(),

    // Supabase Auth (Required for production)
    SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET is required for authentication'),

    // External APIs (Optional)
    INSTAGRAM_CLIENT_ID: z.string().optional(),
    INSTAGRAM_CLIENT_SECRET: z.string().optional(),
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),

    // AI
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
});

// Parse and validate
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 4));
    process.exit(1);
}

export const env = _env.data;
