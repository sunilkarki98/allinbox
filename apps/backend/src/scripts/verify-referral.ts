
import { PlatformService } from '../services/platform.service.js';

async function verifyReferralParsing() {
    console.log('🧪 Verifying Referral Parsing Logic...\n');

    // 1. Mock Payload: Instagram Message from Ad (standard referral)
    const adPayload = {
        object: 'instagram',
        entry: [{
            time: Date.now(),
            messaging: [{
                sender: { id: '123_sender' },
                recipient: { id: '456_page' },
                timestamp: Date.now(),
                message: {
                    mid: 'mid_123',
                    text: 'I want this product',
                },
                postback: {
                    title: 'Start Chatting',
                    payload: 'USER_DEFINED_PAYLOAD',
                    referral: {
                        ref: 'summer_sale_2024',
                        source: 'ADS',
                        type: 'OPEN_THREAD',
                        ad_id: '8888_ad_id'
                    }
                }
            }]
        }]
    };

    console.log('1️⃣ Testing Ad Click Payload...');
    const result1 = await PlatformService.parseInstagramWebhook(adPayload);
    const interaction1 = result1.interactions[0];

    if (interaction1 && interaction1.referral) {
        console.log('✅ EXTRACTION SUCCESS:');
        console.log('   Source:', interaction1.referral.source);
        console.log('   Ad ID:', interaction1.referral.adId);
        console.log('   Ref:', interaction1.referral.ref);
    } else {
        console.error('❌ FAILED: Referral data missing or interaction not created.');
        console.log(JSON.stringify(result1, null, 2));
    }
    console.log('--------------------------------------------------\n');

    // 2. Mock Payload: Shortlink (m.me/ref=xyz) -> usually comes as straight referral in some contexts or postback
    const shortlinkPayload = {
        object: 'instagram',
        entry: [{
            time: Date.now(),
            messaging: [{
                sender: { id: '123_sender' },
                recipient: { id: '456_page' },
                timestamp: Date.now(),
                referral: {
                    ref: 'influencer_campaign_x',
                    source: 'SHORTLINK',
                    type: 'OPEN_THREAD'
                },
                message: {
                    mid: 'mid_456',
                    text: 'Hi',
                }
            }]
        }]
    };

    console.log('2️⃣ Testing Shortlink Payload...');
    const result2 = await PlatformService.parseInstagramWebhook(shortlinkPayload);
    const interaction2 = result2.interactions[0];

    if (interaction2 && interaction2.referral) {
        console.log('✅ EXTRACTION SUCCESS:');
        console.log('   Source:', interaction2.referral.source);
        console.log('   Ref:', interaction2.referral.ref);
    } else {
        console.error('❌ FAILED: Referral data missing.');
        console.log(JSON.stringify(result2, null, 2));
    }
}

verifyReferralParsing().catch(console.error);
