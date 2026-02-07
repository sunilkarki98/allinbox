
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runMigration() {
    console.log('📦 Running AI Traceability Migration...');

    const { db } = await import('../db/index.js');
    const { sql } = await import('drizzle-orm');

    try {
        // Add AI traceability columns
        await db.execute(sql`
            ALTER TABLE interactions 
            ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(100),
            ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ai_reasoning TEXT
        `);
        console.log('✅ Added AI traceability columns');

        // Create index for model version
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS interaction_ai_model_version_idx 
            ON interactions(ai_model_version)
        `);
        console.log('✅ Created ai_model_version index');

        // Backfill existing analyzed interactions
        const result = await db.execute(sql`
            UPDATE interactions 
            SET 
                ai_model_version = 'legacy-unknown',
                ai_analyzed_at = received_at
            WHERE ai_intent IS NOT NULL AND ai_model_version IS NULL
        `);
        console.log(`✅ Backfilled legacy interactions`);

        console.log('\n🎉 Migration complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
