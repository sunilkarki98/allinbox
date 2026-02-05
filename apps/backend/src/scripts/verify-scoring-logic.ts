import { ScoringService } from '../services/scoring.service.js';

async function testScoring() {
    console.log('--- Testing Scoring Service ---');

    // 1. Test Increment Calculation
    const payloads: any[] = [
        { intent: 'purchase_intent', confidence: 100, sentiment: 'positive', type: 'DM', expected: 125 }, // 50 * 1 * 2.5
        { intent: 'purchase_intent', confidence: 100, sentiment: 'positive', type: 'COMMENT', expected: 50 }, // 50 * 1 * 1.0
        { intent: 'pricing_inquiry', confidence: 80, sentiment: 'neutral', type: 'COMMENT', expected: 16 }, // 20 * 0.8 * 1.0
        { intent: 'purchase_intent', confidence: 100, sentiment: 'negative', type: 'DM', expected: -62 }, // (50 * 1 * 2.5) * -0.5 = -62.5 -> -62
        { intent: 'spam', confidence: 100, sentiment: 'neutral', type: 'COMMENT', expected: -100 },
    ];

    let failures = 0;
    for (const p of payloads) {
        const inc = ScoringService.calculateIncrement(p);
        const pass = inc === p.expected;
        if (!pass) failures++;
        console.log(`${pass ? '✅' : '❌'} Payload: ${p.intent}, ${p.type}, ${p.sentiment} -> Inc: ${inc} (Expected: ${p.expected})`);
    }

    // 2. Test Time Decay
    const initialScore = 1000;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const decayed = ScoringService.calculateDecayedScore(initialScore, sevenDaysAgo);
    const decayPass7 = decayed === 500;
    if (!decayPass7) failures++;
    console.log(`${decayPass7 ? '✅' : '❌'} Decay: 1000 points after 7 days -> ${decayed} (Expected: 500)`);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const decayed2 = ScoringService.calculateDecayedScore(initialScore, fourteenDaysAgo);
    const decayPass14 = decayed2 === 250;
    if (!decayPass14) failures++;
    console.log(`${decayPass14 ? '✅' : '❌'} Decay: 1000 points after 14 days -> ${decayed2} (Expected: 250)`);

    // 3. Test Status Transitions
    const statusTests = [
        { score: 50, expected: 'COLD' },
        { score: 150, expected: 'WARM' },
        { score: 600, expected: 'HOT' }
    ];

    for (const t of statusTests) {
        const status = ScoringService.determineStatus(t.score);
        const pass = status === t.expected;
        if (!pass) failures++;
        console.log(`${pass ? '✅' : '❌'} Status ${t.score} -> ${status} (Expected: ${t.expected})`);
    }

    if (failures === 0) {
        console.log('\nSUCCESS: All scoring logic tests passed!');
    } else {
        console.error(`\nFAILURE: ${failures} tests failed!`);
        process.exit(1);
    }
}

testScoring().catch(err => {
    console.error(err);
    process.exit(1);
});
