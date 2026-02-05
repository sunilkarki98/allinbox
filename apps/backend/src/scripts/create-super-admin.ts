import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: '../../../.env' });

const email = process.argv[2];
const defaultPassword = 'admin123'; // Default password for new admins

if (!email) {
    console.error('Please provide an email address: npm run script:admin <email>');
    process.exit(1);
}

async function ensureSuperAdmin() {
    console.log(`Processing ${email}...`);

    // Check if user exists
    const [existing] = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);

    if (existing) {
        console.log(`User found (ID: ${existing.id}). Promoting to SUPER_ADMIN...`);
        await db.update(tenants)
            .set({ role: 'SUPER_ADMIN' })
            .where(eq(tenants.id, existing.id));
        console.log('✅ User promoted successfully.');
    } else {
        console.log(`User not found. Creating new SUPER_ADMIN...`);
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await db.insert(tenants).values({
            email,
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            businessName: 'SaaS Owner'
        });
        console.log(`✅ User created successfully.`);
        console.log(`👉 Login with: ${email} / ${defaultPassword}`);
    }

    process.exit(0);
}

ensureSuperAdmin().catch(console.error);
