
import { db } from '../db/index.js';
import { tenants, customers } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import { CustomersService } from '../services/customers.service.js';

async function verifyProfileMerge() {
    console.log('🔄 Verifying Unified User Profile Merging (Hamro Repair)...\n');

    // 1. Get Tenant Context (Hamro Repair)
    const [tenant] = await db.select().from(tenants).where(eq(tenants.email, 'repair@example.com'));
    if (!tenant) throw new Error('Tenant not found');

    const tenantId = tenant.id;
    console.log(`organization: ${tenant.businessName} (Service-based)`);

    // TEST 1: Safety Check - Same Name should NOT merge
    console.log('\n--- 🛡️ Test 1: Safety Check (Same Name) ---');
    const commonName = `John Doe ${Date.now()}`; /* Randomize to ensure clean run */

    console.log(`1. Creating Instagram user "${commonName}"...`);
    const result1 = await CustomersService.findOrCreate(tenantId, {
        platform: 'INSTAGRAM',
        username: `ig_${Date.now()}`,
        displayName: commonName
    });
    console.log(`   -> Created ID: ${result1.profile.id}`);

    console.log(`2. Creating Facebook user "${commonName}" (Same Name)...`);
    const result2 = await CustomersService.findOrCreate(tenantId, {
        platform: 'FACEBOOK',
        userId: `fb_${Date.now()}`,
        displayName: commonName
    });
    console.log(`   -> Created ID: ${result2.profile.id}`);

    if (result1.profile.id !== result2.profile.id) {
        console.log('✅ SUCCESS: Profiles remained separate (Safe from name collisions).');
    } else {
        console.error('❌ FAILURE: Profiles merged on name alone! (Risky)');
        process.exit(1);
    }


    // TEST 2: Strong Link Check - Same Phone should Merge
    console.log('\n--- 🔗 Test 2: Strong Link Check (Same Phone) ---');
    const userPhone = `9841${Math.floor(Math.random() * 1000000)}`;

    console.log(`1. Creating WhatsApp user with phone ${userPhone}...`);
    const waResult = await CustomersService.findOrCreate(tenantId, {
        platform: 'WHATSAPP',
        phone: userPhone,
        displayName: 'Ram Bahadur'
    });
    console.log(`   -> Created ID: ${waResult.profile.id}`);

    console.log(`2. Creating another WhatsApp interaction with same phone...`);
    // Simulating a second interaction or updated info (e.g. from another channel if we supported phone matching there)
    // For now, testing generic phone match logic
    const waResult2 = await CustomersService.findOrCreate(tenantId, {
        platform: 'WHATSAPP', // Re-entry from same platform or different, core logic checks phone
        phone: userPhone,
        displayName: 'Ram B.' // Different name, same phone
    });
    console.log(`   -> Returned ID: ${waResult2.profile.id}`);

    if (waResult.profile.id === waResult2.profile.id) {
        console.log('✅ SUCCESS: Profiles merged on unique Phone Number.');
    } else {
        console.error('❌ FAILURE: Profiles did NOT merge on phone.');
        process.exit(1);
    }

    console.log('\n✨ All Verifications Passed!');
    process.exit(0);
}

verifyProfileMerge().catch(console.error);
