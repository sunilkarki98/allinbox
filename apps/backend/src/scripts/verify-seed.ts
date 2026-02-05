
import { db } from '../db/index.js';
import { tenants, offerings } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function verifyTenants() {
    console.log('🔍 Verifying Test Tenants...\n');

    const emails = ['shoes@example.com', 'repair@example.com'];

    for (const email of emails) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.email, email));

        if (!tenant) {
            console.error(`❌ Tenant Not Found: ${email}`);
            continue;
        }

        const tenantOfferings = await db.select().from(offerings).where(eq(offerings.tenantId, tenant.id));

        console.log(`✅ Tenant: ${tenant.businessName}`);
        console.log(`   - Email: ${tenant.email}`);
        console.log(`   - Language: ${tenant.language} ${tenant.language === 'ne' ? '(Nepali)' : '(English)'}`);
        console.log(`   - Status: ${tenant.status}`);
        console.log(`   - Offerings (${tenantOfferings.length}):`);
        tenantOfferings.forEach(o => {
            console.log(`     * [${o.type}] ${o.name} (${o.price})`);
        });
        console.log('');
    }

    process.exit(0);
}

verifyTenants().catch(console.error);
