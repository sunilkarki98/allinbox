
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runMigration() {
    console.log('📦 Running Admins Table Migration...');

    const { db } = await import('../db/index.js');
    const { sql } = await import('drizzle-orm');

    try {
        // Create admins table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS admins (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT now(),
                last_login_at TIMESTAMP
            );
        `);
        console.log('✅ Created admins table');

        console.log('\n🎉 Migration complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
