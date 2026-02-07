
import dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface TestCase {
    text: string;
    expectedIntent: string;
    description: string;
}

const TEST_CASES: TestCase[] = [
    // Standard Cases
    { text: "How much for the blue one?", expectedIntent: "pricing_inquiry", description: "Clear pricing question" },
    { text: "Price please", expectedIntent: "pricing_inquiry", description: "Short pricing request" },
    { text: "Do you deliver to Bhaktapur?", expectedIntent: "shipping_inquiry", description: "Delivery location question" },
    { text: "What's the shipping cost?", expectedIntent: "shipping_inquiry", description: "Shipping cost question" },
    { text: "I want to buy this", expectedIntent: "purchase_intent", description: "Direct purchase intent" },
    { text: "Can I order 2 of these?", expectedIntent: "purchase_intent", description: "Order quantity question" },
    { text: "This is broken, worst service ever!", expectedIntent: "complaint", description: "Negative complaint" },
    { text: "My order never arrived", expectedIntent: "complaint", description: "Delivery complaint" },

    // Edge Cases
    { text: "", expectedIntent: "general", description: "Empty string" },
    { text: "🔥🔥🔥", expectedIntent: "general_comment", description: "Emoji only" },
    { text: "hi", expectedIntent: "general", description: "Simple greeting" },
    { text: "Hello there!", expectedIntent: "general", description: "Polite greeting" },
    { text: "i want too byu", expectedIntent: "purchase_intent", description: "Misspelled purchase intent" },
    { text: "😍😍 love it", expectedIntent: "general_comment", description: "Positive emoji + text" },
    { text: "[Media]", expectedIntent: "general_comment", description: "Media placeholder (handled as general_comment)" },

    // Mixed Intent (Ambiguous)
    { text: "Price? Also my order is late", expectedIntent: "pricing_inquiry", description: "Mixed intent (pricing + complaint)" },
    { text: "Do you have this in red and what's the price?", expectedIntent: "purchase_intent", description: "Multi-question" },

    // Spam
    { text: "Click here to win free iPhone!!!", expectedIntent: "spam", description: "Obvious spam" },
    { text: "Make $1000/day working from home", expectedIntent: "spam", description: "Scam message" },

    // Non-English (if language support)
    { text: "कति पर्छ?", expectedIntent: "pricing_inquiry", description: "Nepali pricing question" },
];

async function runAccuracyTest() {
    console.log('🧪 AI Accuracy & Determinism Test Suite\n');
    console.log('='.repeat(80));

    const { AIClient } = await import('@allinbox/ai');
    const aiClient = AIClient.getInstance();

    console.log(`Provider: ${aiClient.name || 'Unknown'}\n`);

    const results: { pass: boolean; text: string; expected: string; actual: string; confidence: number }[] = [];
    let passed = 0;
    let failed = 0;

    const context = {
        businessName: 'Test Business',
        language: 'en'
    };

    for (const testCase of TEST_CASES) {
        try {
            const result = await aiClient.analyzeInteraction(testCase.text, context);
            const isPass = result.intent === testCase.expectedIntent;

            results.push({
                pass: isPass,
                text: testCase.text.slice(0, 40),
                expected: testCase.expectedIntent,
                actual: result.intent,
                confidence: result.confidence
            });

            if (isPass) {
                passed++;
                console.log(`✅ PASS: "${testCase.description}" → ${result.intent} (${result.confidence.toFixed(0)}%)`);
            } else {
                failed++;
                console.log(`❌ FAIL: "${testCase.description}"`);
                console.log(`   Expected: ${testCase.expectedIntent}, Got: ${result.intent} (${result.confidence.toFixed(0)}%)`);
            }
        } catch (err) {
            failed++;
            console.log(`💥 ERROR: "${testCase.description}" - ${err}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`📊 Results: ${passed}/${TEST_CASES.length} passed (${((passed / TEST_CASES.length) * 100).toFixed(1)}%)`);
    console.log(`   Passed: ${passed}, Failed: ${failed}`);

    // Determinism Test
    console.log('\n--- Determinism Test (5 runs on same input) ---');
    const deterTestInput = "How much for the blue one?";
    const deterResults: string[] = [];

    for (let i = 0; i < 5; i++) {
        const r = await aiClient.analyzeInteraction(deterTestInput, context);
        deterResults.push(`${r.intent}:${r.confidence}`);
    }

    const allSame = deterResults.every(r => r === deterResults[0]);
    if (allSame) {
        console.log(`✅ Deterministic: All 5 runs returned "${deterResults[0]}"`);
    } else {
        console.log(`⚠️ Non-deterministic: Results varied across runs`);
        deterResults.forEach((r, i) => console.log(`   Run ${i + 1}: ${r}`));
    }

    // Summary Table
    console.log('\n--- Failure Summary ---');
    const failures = results.filter(r => !r.pass);
    if (failures.length === 0) {
        console.log('🎉 No failures!');
    } else {
        console.table(failures.map(f => ({
            Input: f.text,
            Expected: f.expected,
            Actual: f.actual,
            Confidence: `${(f.confidence * 100).toFixed(0)}%`
        })));
    }

    process.exit(failed > 0 ? 1 : 0);
}

runAccuracyTest().catch(console.error);
