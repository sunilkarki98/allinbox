'use client';

import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export default function OnboardingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to AllInbox
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Let's set up your business profile to get started.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <OnboardingForm />
                </div>
            </div>
        </div>
    );
}
