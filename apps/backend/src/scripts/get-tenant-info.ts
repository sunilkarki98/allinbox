
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';

async function getTenant() {
    console.log('--- Fetching Tenant Info ---');
    const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.email, 'consultancy@allinbox.com')
    });

    if (tenant) {
        console.log(`Tenant ID: ${tenant.id}`);
        console.log(`Email: ${tenant.email}`);
    } else {
        console.log('Tenant not found!');
    }
    process.exit(0);
}

getTenant().catch(console.error);
