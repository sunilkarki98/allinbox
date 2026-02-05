
import crypto from 'crypto';
import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3001/api/ingest/webhook';
// Mock App Secret (Assuming dev mode allows skipping or we use a known one if hardcoded, 
// but likely we need to bypass signature or use the one from env if available.
// Since we are running locally, we can just fetch the one from .env or create a dummy one if the controller enforces it).
// Logic: The controller checks `process.env.META_APP_SECRET`. 
// If it's missing in dev, it warns but allows. If present, we must match.
// I'll try to sign it with a dummy secret first, if it fails I'll check how to make it pass.
const APP_SECRET = 'test_secret';

const payload = {
    object: 'instagram',
    entry: [
        {
            id: '17841405793187218', // Mock Instagram Business Account ID
            time: 1682626297,
            changes: [
                {
                    value: {
                        from: {
                            id: '123456789',
                            username: 'customer_jane'
                        },
                        text: 'How much for the momo platter?',
                        created_time: 1682626297
                    },
                    field: 'comments'
                }
            ]
        }
    ]
};

const signature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(payload)).digest('hex');

async function sendWebhook() {
    console.log('🚀 Sending Mock Webhook...');
    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'x-hub-signature-256': signature
            }
        });

        console.log(`Status: ${res.status}`);
        console.log(`Response: ${await res.text()}`);
    } catch (e) {
        console.error('Failed:', e);
    }
}

sendWebhook();
