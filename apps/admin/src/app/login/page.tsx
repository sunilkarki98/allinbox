'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const { session } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            /* OLD CUSTOM LOGIN
            const res = await api.post('/auth/login', { email, password });
            login(res.token, res.user);
            */
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex bg-gradient-to-b from-gray-900 via-gray-900 to-black">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-indigo-900 via-gray-900 to-black">
                <div className="max-w-md text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl mx-auto mb-8 border border-white/10">
                        A
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">SaaS Admin Portal</h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Control Center for Super Admins.
                        Manage tenants, oversee billing, and monitor platform health.
                    </p>
                    <div className="mt-8 px-6 py-3 bg-white/5 rounded-full border border-white/10 text-sm text-gray-400">
                        🔒 Restricted Access for SaaS Owners Only
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex items-center justify-center p-6 bg-black">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                            A
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                            <p className="text-gray-500 mt-2">Enter credentials to access master control</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Admin Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@allinbox.com"
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {loading ? 'Authenticating...' : 'Access Dashboard'}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-xs text-gray-600">
                        Authorized access only.
                    </div>
                </div>
            </div>
        </div>
    );
}
