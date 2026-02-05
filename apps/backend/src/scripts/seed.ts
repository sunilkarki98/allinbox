
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

// Load env from backend folder
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5433/unified_inbox';

console.log('Connecting to:', connectionString);

const pool = new Pool({
    connectionString,
});

const TENANT_EMAIL = 'consultancy@allinbox.com';

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Seed (Education Consultancy) ---');

        // Hash password 'password123'
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash('password123', saltRounds);

        // ... (enums check)

        // 1. Clean existing data for this tenant
        console.log('Cleaning existing data...');
        const existingTenant = await client.query('SELECT id FROM tenants WHERE email = $1', [TENANT_EMAIL]);
        if (existingTenant.rows.length > 0) {
            const tenantId = existingTenant.rows[0].id;
            await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
            console.log('Deleted existing tenant:', tenantId);
        }

        // 2. Create Tenant
        console.log('Creating Tenant...');
        const tenantRes = await client.query(`
            INSERT INTO tenants (email, password_hash, business_name, role, status, subscription_plan)
            VALUES ($1, $2, $3, 'CUSTOMER', 'TRIAL', 'FREE')
            RETURNING id;
        `, [TENANT_EMAIL, passwordHash, 'Global Pathways Education']);
        const tenantId = tenantRes.rows[0].id;
        console.log('Created Tenant:', tenantId);

        // 3. Connected Accounts
        console.log('Creating Connected Accounts...');
        await client.query(`
            INSERT INTO connected_accounts (tenant_id, platform, platform_user_id, access_token, platform_username)
            VALUES 
            ($1, 'INSTAGRAM', 'ig_global_pathways', 'mock_token', 'global_pathways_edu'),
            ($1, 'FACEBOOK', 'fb_global_pathways', 'mock_token', 'Global Pathways Education'),
            ($1, 'WHATSAPP', 'wa_9841000000', 'mock_token', '9841000000')
        `, [tenantId]);

        // 4. Create Posts
        console.log('Creating Posts...');
        const postsRes = await client.query(`
            INSERT INTO posts (tenant_id, platform, external_id, url, image_url, caption, likes, shares, comments_count, posted_at)
            VALUES 
            ($1, 'INSTAGRAM', 'post_ig_1', 'https://instagram.com/p/aus123', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=80', 'Australia July Intake - Apply Now! 🇦🇺\n#studyabroad #australia #education', 120, 15, 5, NOW() - INTERVAL '2 days'),
            ($1, 'FACEBOOK', 'post_fb_1', 'https://facebook.com/posts/usa456', 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&q=80', 'USA Visa Success Story - Congrats Rohan! 🇺🇸\nMake your dream come true next.', 85, 22, 10, NOW() - INTERVAL '5 days'),
            ($1, 'INSTAGRAM', 'post_ig_2', 'https://instagram.com/p/ielts789', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80', 'IELTS & PTE New Classes starting Sunday. Limited seats! 📚', 45, 5, 2, NOW() - INTERVAL '1 day')
            RETURNING id, external_id;
        `, [tenantId]);

        const posts: Record<string, string> = {}; // Map external_id -> uuid
        postsRes.rows.forEach(r => posts[r.external_id] = r.id);

        // 5. Create Offerings
        console.log('Creating Offerings...');
        const offeringsRes = await client.query(`
            INSERT INTO offerings (tenant_id, type, post_id, name, description, price, price_type, keywords)
            VALUES 
            ($1, 'SERVICE', $2, 'Australia Student Visa Processing', 'Complete guidance for Australia', 'TBD', 'QUOTE', ARRAY['australia', 'visa', 'study']),
            ($1, 'SERVICE', $3, 'USA Counseling', 'Free counseling session', 'Free', 'FIXED', ARRAY['usa', 'america', 'counseling']),
            ($1, 'SERVICE', $4, 'IELTS Preparation Class', '6 weeks intensive course', 'Rs. 8,000', 'FIXED', ARRAY['ielts', 'pte', 'english', 'class'])
            RETURNING id, name;
        `, [
            tenantId,
            posts['post_ig_1'], // Linked to Australia Post
            posts['post_fb_1'], // Linked to USA Post
            posts['post_ig_2']  // Linked to IELTS Post
        ]);

        const offerings: Record<string, string> = {};
        offeringsRes.rows.forEach(r => offerings[r.name] = r.id);

        // 6. Create Customers & Leads
        console.log('Creating Customers & Leads...');

        // Customer 1: Rohan (High Intent Student)
        const cust1 = await client.query(`
            INSERT INTO customers (tenant_id, display_name, email, phone, instagram_username, total_lead_score, status)
            VALUES ($1, 'Rohan Sharma', 'rohan@example.com', '9800000001', 'rohan_fly', 85, 'HOT')
            RETURNING id;
        `, [tenantId]);
        const cust1Id = cust1.rows[0].id;



        // Customer 2: Sita Parent (Pricing Inquiry)
        const cust2 = await client.query(`
            INSERT INTO customers (tenant_id, display_name, facebook_user_id, total_lead_score, status)
            VALUES ($1, 'Sita Parents', 'fb_sita_123', 40, 'WARM')
            RETURNING id;
        `, [tenantId]);
        const cust2Id = cust2.rows[0].id;



        // Customer 3: Urgent Support (Anjali)
        const cust3 = await client.query(`
            INSERT INTO customers (tenant_id, display_name, whatsapp_phone, total_lead_score, status)
            VALUES ($1, 'Anjali K', '9811111111', 90, 'HOT')
            RETURNING id;
        `, [tenantId]);
        const cust3Id = cust3.rows[0].id;




        // 7. Create Interactions
        console.log('Creating Interactions...');

        // Rohan - Comment on Australia Post
        await client.query(`
            INSERT INTO interactions (
                tenant_id, post_id, customer_id, offering_id,
                platform, type, external_id, sender_username, content_text,
                received_at, ai_intent, ai_confidence, ai_suggestion, sentiment, lead_score_change
            ) VALUES (
                $1, $2, $3, $4,
                'INSTAGRAM', 'COMMENT', 'comm_1', 'rohan_fly', 'I have 6.5 in IELTS, can I apply for Masters in Sydney?',
                NOW() - INTERVAL '2 hours', 'eligibility_inquiry', 95, 'Yes, 6.5 is good for most universities! DM us marks.', 'positive', 10
            )
        `, [tenantId, posts['post_ig_1'], cust1Id, offerings['Australia Student Visa Processing']]);

        // Sita - DM about Pricing (FB)
        await client.query(`
            INSERT INTO interactions (
                tenant_id, post_id, customer_id, offering_id,
                platform, type, external_id, sender_username, content_text,
                received_at, ai_intent, ai_confidence, ai_suggestion, sentiment, lead_score_change, post_reference
            ) VALUES (
                $1, $2, $3, $4,
                'FACEBOOK', 'DM', 'dm_fb_1', 'fb_sita_123', 'How much is your processing charge for USA?',
                NOW() - INTERVAL '5 hours', 'pricing_inquiry', 92, 'We have a free counseling session first. Processing is nominal.', 'neutral', 5, 'USA Visa Success Story - Congrats Rohan! 🇺🇸'
            )
        `, [tenantId, posts['post_fb_1'], cust2Id, offerings['USA Counseling']]);

        // Anjali - Urgent WhatsApp (linked to IELTS post)
        await client.query(`
            INSERT INTO interactions (
                tenant_id, post_id, customer_id, offering_id,
                platform, type, external_id, sender_username, content_text,
                received_at, ai_intent, ai_confidence, ai_suggestion, sentiment, flag_urgent, lead_score_change,
                source_channel, source_post_id
            ) VALUES (
                $1, NULL, $3, $4,
                'WHATSAPP', 'DM', 'dm_wa_1', '9811111111', 'My interview is tomorrow, need mock test help immediately!',
                NOW() - INTERVAL '10 minutes', 'support_request', 88, 'Please come to office by 4 PM for mock test.', 'negative', true, 20,
                'INSTAGRAM', $2
            )
        `, [tenantId, posts['post_ig_2'], cust3Id, offerings['IELTS Preparation Class']]);

        console.log('--- Seed Complete ---');

    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
