import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@allinbox/db';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

import { env } from '../config/env.js';

// Use a connection pool with proper limits for production
const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout for getting connection
    // Required for Supabase SSL connection
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Log pool errors
pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

export const db = drizzle(pool, { schema });

// Graceful shutdown helper
export const closeDbConnection = async () => {
    try {
        await pool.end();
        console.log('✅ PostgreSQL connection pool closed');
    } catch (err) {
        console.error('❌ Error closing PostgreSQL pool:', err);
    }
};

