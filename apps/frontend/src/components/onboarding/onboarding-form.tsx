'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Reuse the schema from the validators package if possible, or define here matching backend
const onboardingSchema = z.object({
    businessName: z.string().min(1, 'Business name is required'),
    businessType: z.enum(['PRODUCT', 'SERVICE']),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<OnboardingData>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            businessType: 'PRODUCT' // Default
        }
    });

    const businessType = watch('businessType');

    const onSubmit = async (data: OnboardingData) => {
        setIsLoading(true);
        setError(null);

        try {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];

            const response = await fetch('http://localhost:3001/api/auth/onboarding/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to complete onboarding');
            }

            // Success - Redirect to dashboard
            // Force a hard reload to ensure auth state updates if it depends on the user object
            window.location.href = '/dashboard';

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsLoading(false);
        }
    };

    const nextStep = () => setStep(2);
    const prevStep = () => setStep(1);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Steps Indicator */}
            <div className="flex justify-center mb-6 space-x-2">
                <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            </div>

            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            What is your Business Name?
                        </label>
                        <input
                            {...register('businessName')}
                            placeholder="e.g. Acme Corp"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                        {errors.businessName && (
                            <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={async () => {
                            const valid = await trigger('businessName'); // Trigger validation manually if needed, or just simple check
                            if (watch('businessName')) nextStep();
                        }}
                        className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Next
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            What do you primarily sell?
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Product Option */}
                            <div
                                onClick={() => setValue('businessType', 'PRODUCT')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${businessType === 'PRODUCT'
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-200'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🛍️</div>
                                <div className="font-semibold">Products</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    I ship physical items to customers.
                                </div>
                            </div>

                            {/* Service Option */}
                            <div
                                onClick={() => setValue('businessType', 'SERVICE')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${businessType === 'SERVICE'
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-200'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🛠️</div>
                                <div className="font-semibold">Services</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    I provide services, repairs, or consultations.
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={prevStep}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-black dark:bg-white text-white dark:text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Setting up...' : 'Complete Setup'}
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}
