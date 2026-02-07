
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runLoadTest() {
    console.log('🚀 AI Pipeline Load Test\n');

    const { Queue } = await import('bullmq');
    const { getBullConnection } = await import('../utils/clients.js');
    const { dragonfly } = await import('../utils/clients.js');

    // Connect to Dragonfly
    await dragonfly.connect();

    const NUM_INTERACTIONS = 100;
    const analysisQueue = new Queue('analysis-queue', { connection: getBullConnection() });

    console.log(`📥 Queuing ${NUM_INTERACTIONS} mock interactions for analysis...`);

    const startTime = Date.now();

    // Queue many jobs concurrently
    const jobs = [];
    for (let i = 0; i < NUM_INTERACTIONS; i++) {
        jobs.push(
            analysisQueue.add('analyze', {
                interactionId: `load-test-${i}-${Date.now()}`
            })
        );
    }

    await Promise.all(jobs);
    const queueTime = Date.now() - startTime;

    console.log(`✅ Queued ${NUM_INTERACTIONS} jobs in ${queueTime}ms`);
    console.log(`   Average: ${(queueTime / NUM_INTERACTIONS).toFixed(2)}ms per job`);

    // Check queue status
    const waiting = await analysisQueue.getWaitingCount();
    const active = await analysisQueue.getActiveCount();
    const completed = await analysisQueue.getCompletedCount();
    const failed = await analysisQueue.getFailedCount();

    console.log('\n📊 Queue Status:');
    console.log(`   Waiting: ${waiting}`);
    console.log(`   Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);

    // Wait a bit and check again
    console.log('\n⏳ Waiting 5 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const waiting2 = await analysisQueue.getWaitingCount();
    const completed2 = await analysisQueue.getCompletedCount();
    const failed2 = await analysisQueue.getFailedCount();

    console.log('\n📊 Queue Status (after 5s):');
    console.log(`   Waiting: ${waiting2}`);
    console.log(`   Completed: ${completed2} (+${completed2 - completed})`);
    console.log(`   Failed: ${failed2} (+${failed2 - failed})`);

    if (failed2 > failed) {
        console.log('\n⚠️ Some jobs failed during load test. Check worker logs.');
    } else {
        console.log('\n✅ Load test completed without new failures.');
    }

    await analysisQueue.close();
    await dragonfly.quit();
    process.exit(0);
}

runLoadTest().catch(console.error);
