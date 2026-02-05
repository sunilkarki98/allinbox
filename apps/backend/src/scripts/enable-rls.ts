import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function enableRLS() {
    console.log('🛡️  Enabling Row Level Security (RLS) policies...');

    // List of tables to secure
    const tables = [
        'tenants',
        'connected_accounts',
        'posts',
        'products',
        'leads',
        'interactions',
        'reply_templates',
        'api_keys',
        'webhooks',
        'audit_logs'
    ];

    try {
        for (const table of tables) {
            console.log(`   - Securing table: ${table}`);

            // 1. Enable RLS
            await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`));

            // 2. Drop existing policy if exists (idempotency)
            await db.execute(sql.raw(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`));

            // 3. Create Policy
            // Rule: "current_user_id" session setting must match "tenant_id" column, 
            // OR the row's tenant_id must match the authenticated user's ID.
            // Note: For 'tenants' table, user can only see their OWN record (id = current_tenant_id)

            let policySQL = '';

            if (table === 'tenants') {
                // For tenants table, the 'id' column is the tenant_id
                policySQL = `
                    CREATE POLICY tenant_isolation_policy ON "${table}"
                    USING (
                        id = current_setting('app.current_tenant_id', true)::uuid
                    );
                `;
            } else {
                // For other tables, they have a 'tenant_id' column
                policySQL = `
                    CREATE POLICY tenant_isolation_policy ON "${table}"
                    USING (
                        tenant_id = current_setting('app.current_tenant_id', true)::uuid
                    );
                `;
            }

            await db.execute(sql.raw(policySQL));
        }

        console.log('✅ RLS Policies applied successfully!');
        console.log('ℹ️  Note: Superusers (like "postgres") bypass these policies automatically.');
        console.log('ℹ️  To test RLS, you must use a non-superuser role or SET ROLE.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Failed to apply RLS:', e);
        process.exit(1);
    }
}

enableRLS();
