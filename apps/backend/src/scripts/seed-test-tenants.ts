
import { db } from '../db/index.js';
import { tenants, offerings } from '@allinbox/db';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seedTestTenants() {
    console.log('🌱 Seeding Test Tenants...');

    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

    // 1. PRODUCT SELLER (Kathmandu Kicks - Shoes - Nepali)
    console.log('👟 Creating Product Seller: Kathmandu Kicks...');
    let [productTenant] = await db.insert(tenants).values({
        email: 'shoes@example.com',
        passwordHash,
        businessName: 'Kathmandu Kicks',
        status: 'ACTIVE', // valid enum value
        language: 'ne', // Nepali
        subscriptionPlan: 'FREE'
    }).onConflictDoUpdate({
        target: tenants.email,
        set: {
            businessName: 'Kathmandu Kicks',
            language: 'ne'
        }
    }).returning();

    // Create Offerings for Product Seller
    await db.insert(offerings).values([
        {
            tenantId: productTenant.id,
            type: 'PRODUCT',
            name: 'Goldstar Classic',
            description: 'Classic soulful shoes for everyday walking.',
            price: 'Rs. 1,500',
            priceType: 'FIXED',
            keywords: ['goldstar', 'shoes', 'running']
        },
        {
            tenantId: productTenant.id,
            type: 'PRODUCT',
            name: 'Nike Air Copy',
            description: 'High quality first copy sneakers.',
            price: 'Rs. 3,500',
            priceType: 'FIXED',
            keywords: ['nike', 'sneakers', 'sports']
        }
    ]);


    // 2. SERVICE SELLER (Hamro Repair - Repair - English)
    console.log('🔧 Creating Service Seller: Hamro Repair...');
    let [serviceTenant] = await db.insert(tenants).values({
        email: 'repair@example.com',
        passwordHash,
        businessName: 'Hamro Repair',
        status: 'ACTIVE',
        language: 'en', // English
        subscriptionPlan: 'FREE'
    }).onConflictDoUpdate({
        target: tenants.email,
        set: {
            businessName: 'Hamro Repair',
            language: 'en'
        }
    }).returning();

    // Create Offerings for Service Seller
    await db.insert(offerings).values([
        {
            tenantId: serviceTenant.id,
            type: 'SERVICE',
            name: 'Mobile Screen Repair',
            price: 'Rs. 1,000+',
            description: 'iPhone and Android screen replacement.',
            priceType: 'RANGE',
            keywords: ['screen', 'broken', 'display', 'iphone']
        },
        {
            tenantId: serviceTenant.id,
            type: 'SERVICE',
            name: 'Laptop Servicing',
            price: 'Rs. 800',
            description: 'Dust cleaning and thermal paste replacement.',
            priceType: 'FIXED',
            keywords: ['laptop', 'slow', 'heating', 'service']
        }
    ]);

    console.log('✅ Seeding Complete!');
    console.log(`Product Seller ID: ${productTenant.id} (Email: shoes@example.com)`);
    console.log(`Service Seller ID: ${serviceTenant.id} (Email: repair@example.com)`);
    process.exit(0);
}

seedTestTenants().catch((err) => {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
});
