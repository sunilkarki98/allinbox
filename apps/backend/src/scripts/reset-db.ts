
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend folder
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5433/unified_inbox';

console.log('Connecting to:', connectionString);

const pool = new Pool({
    connectionString,
});

async function reset() {
    const client = await pool.connect();
    try {
        console.log('--- Warning: PERFORMING HARD RESET ---');
        console.log('Dropping public schema...');

        await client.query('DROP SCHEMA public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        await client.query('GRANT ALL ON SCHEMA public TO public;'); // standard permissions
        await client.query('GRANT ALL ON SCHEMA public TO "user";');

        console.log('--- Database Wiped Successfully ---');

    } catch (err) {
        console.error('Error resetting DB:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

reset();
