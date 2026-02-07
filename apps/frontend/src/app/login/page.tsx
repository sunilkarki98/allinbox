'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

function LoginForm() {
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const viewParam = searchParams.get('view');
    const isSignup = viewParam === 'signup';
    const [error, setError] = useState('');
    const { session } = useAuth();

    useEffect(() => {
        if (errorParam) {
            const errorMap: Record<string, string> = {
                'google_auth_failed': 'Google authentication failed',
                'login_failed': 'Login failed. Please try again.',
                'csrf_mismatch': 'Security session expired. Please try again.',
                'missing_params': 'Invalid authentication response.',
                'auth_init_failed': 'Could not start authentication.'
            };
            setError(errorMap[errorParam] || 'An error occurred during sign in');
        }
    }, [errorParam]);

    // NEW: Auto-redirect if already logged in (Double Check)
    const router = useRouter();
    useEffect(() => {
        const checkSession = async () => {
            // Check context first
            if (session) {
                router.push('/dashboard');
                return;
            }
            // Check Supabase directly (bypassing context delay)
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                router.push('/dashboard');
            }
        };
        checkSession();
    }, [session, router]);

    const handleGoogleLogin = async () => {
        /* OLD GOOGLE LOGIN REDIRECT
        window.location.href = '/api/auth/google';
        */
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });

        if (error) {
            setError(error.message);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                    U
                </div>
                <h1 className="text-2xl font-bold text-white">UnifiedInbox</h1>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        {isSignup ? 'Create your account' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-400 mt-2">
                        {isSignup ? 'Get started with your free trial' : 'Sign in to access your dashboard'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/5"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {isSignup ? 'Sign up with Google' : 'Sign in with Google'}
                    </button>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    By signing in, you agree to our{' '}
                    <a href="#" className="underline hover:text-gray-400">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>.
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex bg-gradient-to-b from-gray-900 via-gray-900 to-black">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl mx-auto mb-8">
                        U
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">UnifiedInbox</h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Manage Instagram, Facebook, and WhatsApp messages in one powerful dashboard.
                        AI-powered lead scoring helps you focus on what matters.
                    </p>
                    <div className="flex justify-center gap-4 mt-8 opacity-70">
                        <span className="text-2xl">📸</span>
                        <span className="text-2xl">📘</span>
                        <span className="text-2xl">💬</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login */}
            <div className="flex-1 flex items-center justify-center p-6">
                <Suspense fallback={<div className="text-white">Loading login...</div>}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
