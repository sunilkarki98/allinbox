import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkPrivileges() {
    try {
        const result = await db.execute(sql`
            SELECT 
                current_user as "user", 
                session_user as "session", 
                current_setting('is_superuser') as "is_superuser"
        `);
        console.log('Privilege Check:', result.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e);
        process.exit(1);
    }
}

checkPrivileges();
