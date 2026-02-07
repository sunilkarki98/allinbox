import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './drizzle',
    dbCredentials: {

        // Ensure SSL is enabled for Supabase
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/allinbox',
        ssl: { rejectUnauthorized: false },
    },
});
