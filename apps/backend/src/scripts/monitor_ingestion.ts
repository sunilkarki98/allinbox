
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function monitorIngestion() {
    console.log('📡 Starting Ingestion Event Monitor...');

    try {
        // Dynamic import to ensure config loads after dotenv
        const { dragonfly } = await import('../utils/clients.js');

        // Use a separate subscriber client to avoid blocking the main client (though dragonfly manager might share)
        // Actually, for pub/sub in node-redis, we need a duplicate connection usually, or .duplicate()
        // The DragonflyManager exposes `getClient()` which returns the main client.
        // We should duplicate it for subscription mode.

        console.log('🔌 Connecting to Redis...');
        await dragonfly.connect();
        const mainClient = dragonfly.getClient();

        const subscriber = mainClient.duplicate();
        await subscriber.connect();

        console.log('✅ Connected. Listening for "events" channel...');

        await subscriber.subscribe('events', (message) => {
            try {
                const event = JSON.parse(message);
                if (event.type === 'ingestion_complete') {
                    const timestamp = new Date().toISOString();
                    console.log(`[${timestamp}] 📥 Ingestion Complete:`, JSON.stringify(event.data, null, 2));
                    if (event.tenantId) console.log(`   Tenant: ${event.tenantId}`);
                } else {
                    console.log('Received other event:', event.type);
                }
            } catch (err) {
                console.error('Error parsing message:', message, err);
            }
        });

        // Keep alive until Ctrl+C
        process.on('SIGINT', async () => {
            console.log('\n🛑 Stopping monitor...');
            await subscriber.unsubscribe('events');
            await subscriber.quit();
            await dragonfly.quit();
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Error starting monitor:', err);
        process.exit(1);
    }
}

monitorIngestion();
