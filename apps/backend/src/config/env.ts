import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis / Dragonfly
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // Security
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    // External APIs (Optional in Dev, Required in Prod usually, but we keep optional for now to avoid breaking local dev if not set)
    INSTAGRAM_CLIENT_ID: z.string().optional(),
    INSTAGRAM_CLIENT_SECRET: z.string().optional(),
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),

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
