import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
    schema: '/home/cosmic-soul/Desktop/allinbox/packages/db/src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
