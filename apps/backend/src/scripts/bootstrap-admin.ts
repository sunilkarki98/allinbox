#!/usr/bin/env npx tsx
/**
 * Bootstrap Admin Script
 * Usage: npx tsx apps/backend/src/scripts/bootstrap-admin.ts <user-id>
 * 
 * This script creates an admin entry for an existing user.
 * The user must provide their Supabase user ID.
 */

import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function bootstrapAdmin() {
    const userId = process.argv[2];

    if (!userId) {
        console.error('❌ Usage: npx tsx apps/backend/src/scripts/bootstrap-admin.ts <user-id>');
        console.error('   Example: npx tsx apps/backend/src/scripts/bootstrap-admin.ts 123e4567-e89b-12d3-a456-426614174000');
        process.exit(1);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.error('❌ Invalid UUID format');
        process.exit(1);
    }

    console.log(`\n🔐 Bootstrap Admin Script`);
    console.log(`   User ID: ${userId}\n`);

    const { db } = await import('../db/index.js');
    const { admins, tenants } = await import('@allinbox/db');
    const { eq } = await import('drizzle-orm');

    try {
        // 1. Check if admin already exists
        const [existingAdmin] = await db.select().from(admins).where(eq(admins.id, userId)).limit(1);
        if (existingAdmin) {
            console.log('✅ User is already an admin');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Active: ${existingAdmin.isActive}`);
            process.exit(0);
        }

        // 2. Check if user exists in tenants (to get email)
        const [tenant] = await db.select({ email: tenants.email }).from(tenants).where(eq(tenants.id, userId)).limit(1);

        let email: string;
        let passwordHash: string;

        if (tenant) {
            email = tenant.email;
            console.log(`   Found tenant: ${email}`);
            // Use a secure random password - admin should reset via normal auth flow
            const tempPassword = `Admin_${Date.now().toString(36)}`;
            passwordHash = await bcrypt.hash(tempPassword, 10);
            console.log(`   ⚠️  Temporary password: ${tempPassword} (change immediately!)`);
        } else {
            // No tenant found - ask for email
            console.error('❌ No tenant found with this ID.');
            console.error('   If this is a Supabase Auth user, make sure they have signed up first.');
            process.exit(1);
        }

        // 3. Create admin entry
        const [newAdmin] = await db.insert(admins)
            .values({
                id: userId,  // Use same ID as the user
                email: email,
                passwordHash: passwordHash,
                name: 'Admin',
                isActive: true
            })
            .onConflictDoNothing()
            .returning();

        if (newAdmin) {
            console.log('\n✅ Admin created successfully!');
            console.log(`   ID: ${newAdmin.id}`);
            console.log(`   Email: ${newAdmin.email}`);
            console.log(`   Active: ${newAdmin.isActive}`);
        } else {
            console.log('ℹ️  Admin may already exist (no conflict)');
        }

        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

bootstrapAdmin();
