import { db } from '../db/index.js';
import { dragonfly } from '../utils/clients.js';
// import { AIService } from '../services/ai.service.js';
import { ScoringService } from '../services/scoring.service.js';
import { tenants } from '@allinbox/db';
import { sql } from 'drizzle-orm';

async function runHealthCheck() {
    console.log('🚀 Starting Global System Health Check...\n');

    let overallSuccess = true;

    // 1. Database Connectivity
    try {
        await db.execute(sql`SELECT 1`);
        console.log('✅ Database: Connected');
    } catch (err: any) {
        console.error('❌ Database: Connection Failed', err.message);
        overallSuccess = false;
    }

    // 2. Redis/Dragonfly Connectivity
    try {
        const client = dragonfly.getClient();
        await client.ping();
        console.log('✅ Redis/Dragonfly: Connected');
    } catch (err: any) {
        console.error('❌ Redis/Dragonfly: Connection Failed', err.message);
        overallSuccess = false;
    }

    // 3. AI Service (Logic & Fallback)
    // try {
    //     const result = await AIService.analyzeInteraction('I love this product!', { businessName: 'TestBiz', products: [] });
    //     console.log(`✅ AI Service: Analysis Working (Intent: ${result.intent})`);
    // } catch (err: any) {
    //     console.error('❌ AI Service: Failed', err.message);
    //     overallSuccess = false;
    // }
    console.log('⚠️ AI Service: Skipped (Being Refactored to @allinbox/ai)');

    // 4. Scoring Service (Core Logic)
    try {
        const payload = { intent: 'purchase_intent', confidence: 100, sentiment: 'positive', type: 'DM' };
        const increment = ScoringService.calculateIncrement(payload);
        if (increment === 125) {
            console.log('✅ Scoring Service: Logic Verified (DM Weighting)');
        } else {
            throw new Error(`Incorrect increment: ${increment}`);
        }
    } catch (err: any) {
        console.error('❌ Scoring Service: Logic Check Failed', err.message);
        overallSuccess = false;
    }

    console.log('\n--- Health Check Summary ---');
    if (overallSuccess) {
        console.log('🟢 ALL SYSTEMS OPERATIONAL');
        process.exit(0);
    } else {
        console.log('🔴 SYSTEM DEGRADED');
        process.exit(1);
    }
}

runHealthCheck().catch(err => {
    console.error('Fatal health check error:', err);
    process.exit(1);
});
