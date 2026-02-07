

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';

// Bypass SSL validation for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Bypassing env loading issues by hardcoding the connection string for this script only
const DATABASE_URL = 'postgresql://postgres:allinboxdb123@db.zjtkncpkjopedcydpupi.supabase.co:5432/postgres?sslmode=require';

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
});

const db = drizzle(pool);

async function findDuplicates() {
    console.log('🔍 Scanning for duplicate customer profiles...');

    const checks = [
        { field: 'instagram_username', label: 'Instagram Username' },
        { field: 'facebook_user_id', label: 'Facebook User ID' },
        { field: 'whatsapp_phone', label: 'WhatsApp Phone' }
    ];

    let totalDuplicates = 0;

    for (const check of checks) {
        const query = sql`
            SELECT ${sql.raw(check.field)}, COUNT(*) as count, array_agg(id) as ids
            FROM customers
            WHERE ${sql.raw(check.field)} IS NOT NULL
            GROUP BY ${sql.raw(check.field)}, tenant_id
            HAVING COUNT(*) > 1;
        `;

        const results = await db.execute(query);

        if (results.rows.length > 0) {
            console.log(`\n⚠️ Found duplicates by ${check.label}:`);
            results.rows.forEach((row: any) => {
                console.log(`   - Value: ${row[check.field]} | Count: ${row.count} | IDs: ${row.ids}`);
                totalDuplicates += parseInt(row.count) - 1;
            });
        } else {
            console.log(`✅ No duplicates found by ${check.label}`);
        }
    }

    if (totalDuplicates > 0) {
        console.error(`\n❌ CRITICAL: Found ${totalDuplicates} redundant customer profiles.`);
        console.log('   Run `fix_duplicates.ts` to merge them before applying constraints.');
        process.exit(1);
    } else {
        console.log('\n✅ Database is clean! Safe to apply unique constraints.');
        process.exit(0);
    }
}

findDuplicates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
