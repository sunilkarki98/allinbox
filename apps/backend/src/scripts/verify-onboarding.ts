
import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';
import { AuthService } from '../services/auth.service.js';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Starting onboarding verification...');

    // 1. Create a test user
    const email = `test-onboarding-${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`Creating test user: ${email}`);
    const registerResult = await AuthService.register({ email, password });
    const userId = registerResult.user.id;
    console.log(`User created with ID: ${userId}`);

    // 2. Complete onboarding
    console.log('Completing onboarding...');
    const onboardingData = {
        businessName: 'Acme Corp',
        businessType: 'SERVICE' as const // Type assertion strictly for the test input
    };

    // Validate locally to mimic controller behavior
    if (onboardingData.businessType !== 'PRODUCT' && onboardingData.businessType !== 'SERVICE') {
        throw new Error('Invalid business type');
    }

    const updatedUser = await AuthService.completeOnboarding(userId, onboardingData);

    // 3. Verify DB state
    const [dbUser] = await db.select().from(tenants).where(eq(tenants.id, userId));

    console.log('Verification Results:');
    console.log(`- Onboarding Completed: ${dbUser.onboardingCompleted}`);
    console.log(`- Business Name: ${dbUser.businessName}`);
    console.log(`- Business Type: ${dbUser.businessType}`);
    console.log(`- Preferences (should be empty object):`, dbUser.preferences);

    if (
        dbUser.onboardingCompleted === true &&
        dbUser.businessName === 'Acme Corp' &&
        dbUser.businessType === 'SERVICE'
    ) {
        console.log('✅ SUCCESS: Onboarding verification passed!');
    } else {
        console.error('❌ FAILURE: Onboarding verification failed!');
        process.exit(1);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
