
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../../../.env' });

const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    await client.connect();
    console.log('🔌 Connected to DB');

    try {
        console.log('   Creating Customers table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
                display_name varchar(255),
                email varchar(255),
                phone varchar(50),
                avatar_url varchar(512),
                instagram_username varchar(255),
                facebook_user_id varchar(255),
                whatsapp_phone varchar(50),
                tiktok_username varchar(255),
                total_lead_score integer DEFAULT 0,
                last_intent varchar(50),
                status lead_status DEFAULT 'COLD',
                total_interactions integer DEFAULT 0,
                last_interaction_at timestamp,
                tags text[],
                notes text,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            );
        `);

        console.log('   Creating Indexes for Customers...');
        await client.query(`CREATE INDEX IF NOT EXISTS customer_tenant_idx ON customers(tenant_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS customer_ig_idx ON customers(tenant_id, instagram_username);`);
        await client.query(`CREATE INDEX IF NOT EXISTS customer_fb_idx ON customers(tenant_id, facebook_user_id);`);

        console.log('   Updating Interactions table...');
        // Add customer_id column if not exists
        await client.query(`
            ALTER TABLE interactions 
            ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
        `);

        // Remove user_profile_id if exists (cleanup)
        // await client.query(`ALTER TABLE interactions DROP COLUMN IF EXISTS user_profile_id;`); // Optional: keep for safety locally? No, clean it.

        console.log('✅ Migration Complete');
    } catch (e) {
        console.error('❌ Migration Failed:', e);
    } finally {
        await client.end();
    }
}

migrate();
