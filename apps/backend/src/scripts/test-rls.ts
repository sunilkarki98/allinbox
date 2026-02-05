import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { leads, tenants } from '@allinbox/db';

async function testRLS() {
    console.log('🧪 Testing RLS Isolation...');

    // 1. Get a real tenant ID
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
        console.error('No tenants found to test with.');
        process.exit(1);
    }
    const tenantId = tenant.id;
    console.log(`   Target Tenant ID: ${tenantId}`);

    try {
        // Attempt to create a temporary test user if not exists
        console.log('   Creating temporary test role "app_test_user"...');
        try {
            await db.execute(sql`CREATE ROLE app_test_user WITH LOGIN PASSWORD 'test_pass';`);
        } catch (e) {
            // Role might already exist
        }
        await db.execute(sql`GRANT ALL ON ALL TABLES IN SCHEMA public TO app_test_user;`);
        await db.execute(sql`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_test_user;`);

        // Switch to this user for the session
        // Note: In connection pooling, we must be careful. 
        // For this test script, we assume a single connection or we use a transaction.
        // A transaction is the only way to guarantee we occupy the same connection for SET LOCAL.

        console.log('   [Test 1] Querying leads WITHOUT setting context (as app_test_user)...');
        await db.transaction(async (tx) => {
            // Switch role inside transaction to ensure it applies to the select
            await tx.execute(sql`SET ROLE app_test_user;`);

            // Should return 0 rows because app.current_tenant_id is NULL/Empty
            const res1 = await tx.select().from(leads).limit(5);
            console.log(`   -> Rows returned: ${res1.length} (Expected: 0)`);

            if (res1.length > 0) {
                console.error('   ❌ RLS FAILED! Data leaked without context.');
            } else {
                console.log('   ✅ RLS Success: No data returned without context.');
            }

            // Reset role before ending transaction (optional, but good practice)
            await tx.execute(sql`RESET ROLE;`);
        });

        console.log('   [Test 2] Querying leads WITH context...');
        await db.transaction(async (tx) => {
            await tx.execute(sql`SET ROLE app_test_user;`);
            await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}';`));

            const res2 = await tx.select().from(leads).limit(5);
            console.log(`   -> Rows returned: ${res2.length} (Expected: > 0)`);

            if (res2.length > 0) {
                console.log('   ✅ RLS Success: Data returned with correct context.');
            } else {
                console.warn('   ⚠️  No data returned. Maybe tenant has no leads?');
            }
            // Reset role
            await tx.execute(sql`RESET ROLE;`);
        });

    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }

    process.exit(0);
}

testRLS();
