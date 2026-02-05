import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { getInteractions } from '../controllers/interactions.controller.js';
import { eq } from 'drizzle-orm';

async function verify() {
    console.log('🔍 Verifying API Enrichment...');

    // 1. Get Tenant ID
    const [tenant] = await db.select().from(tenants).where(eq(tenants.email, 'demo@allinbox.com')).limit(1);

    if (!tenant) {
        console.error('❌ Tenant not found. Seed DB first.');
        process.exit(1);
    }
    console.log(`   Tenant ID: ${tenant.id}`);

    // 2. Mock Request/Response
    const req: any = {};
    const res: any = {
        locals: {
            user: { userId: tenant.id }
        },
        status: (code: number) => {
            console.log(`   Status: ${code}`);
            return res;
        },
        json: (data: any) => {
            console.log('   ✅ API Response Received');

            // 3. Inspect Data
            if (!Array.isArray(data)) {
                console.error('❌ Expected array response');
                return;
            }

            console.log(`   Items: ${data.length}`);
            if (data.length === 0) {
                console.warn('   ⚠️ No interactions found');
                return;
            }

            const item = data[0];
            const hasProduct = data.some(i => i.productName);
            const hasLeadScore = data.some(i => i.leadScore !== null);

            console.log('   Sample Item:', {
                id: item.id,
                platform: item.platform,
                postUrl: item.postUrl,
                productName: item.productName,
                leadScore: item.leadScore,
                leadTags: item.leadTags
            });

            if (hasProduct) console.log('   ✅ Product Name enrichment found');
            else console.error('   ❌ Product Name missing in all items');

            if (hasLeadScore) console.log('   ✅ Lead Score enrichment found');
            else console.error('   ❌ Lead Score missing in all items');
        }
    };

    // 3. Call Controller
    await getInteractions(req, res);
    process.exit(0);
}

verify();
