import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address: npm run script:admin <email>');
    process.exit(1);
}

async function promoteToAdmin() {
    console.log(`Promoting ${email} to SUPER_ADMIN...`);

    const [updated] = await db.update(tenants)
        .set({ role: 'SUPER_ADMIN' })
        .where(eq(tenants.email, email))
        .returning({ id: tenants.id, email: tenants.email, role: tenants.role });

    if (!updated) {
        console.error('User not found!');
        process.exit(1);
    }

    console.log('Success! User promoted:', updated);
    process.exit(0);
}

promoteToAdmin().catch(console.error);
