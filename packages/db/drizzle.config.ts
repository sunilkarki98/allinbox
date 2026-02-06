import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: (process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/allinbox').replace('?sslmode=require', ''),
        ssl: { rejectUnauthorized: false },
    },
});
