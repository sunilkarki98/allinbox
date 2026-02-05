'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEffect } from 'react';
import { PlatformIcon } from './platform-badge';
import {
    IconUser,
    IconLink,
    IconShield,
    IconLogout,
    IconChevronRight
} from '@/components/icons';

export function SettingsView() {

    const { user, logout } = useAuth();
    const [connecting, setConnecting] = React.useState<Record<string, boolean>>({});
    const [connected, setConnected] = React.useState<Record<string, boolean>>({
        instagram: false,
        facebook: false,
        whatsapp: false
    });

    useEffect(() => {
        if (!user) return;

        const fetchAccounts = async () => {
            try {
                const response = await api.get('/platforms');
                const accounts = response.accounts || [];
                const newConnected = {
                    instagram: false,
                    facebook: false,
                    whatsapp: false
                };

                accounts.forEach((acc: any) => {
                    const platformKey = acc.platform.toLowerCase();
                    if (platformKey in newConnected) {
                        (newConnected as any)[platformKey] = true;
                    }
                });

                setConnected(newConnected);
            } catch (error) {
                console.error('Failed to fetch connected accounts', error);
            }
        };

        fetchAccounts();
    }, [user]);

    const handleConnect = async (platform: string) => {
        setConnecting(prev => ({ ...prev, [platform]: true }));
        const isDisconnecting = connected[platform];

        try {
            if (isDisconnecting) {
                // Disconnect
                await api.post('/platforms/disconnect', { platform: platform.toUpperCase() });
                toast.info(`Disconnected from ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
            } else {
                // Connect
                await api.post('/platforms/connect', { platform: platform.toUpperCase() });
                toast.success(`Connected to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
            }

            // Toggle local state
            setConnected(prev => ({ ...prev, [platform]: !isDisconnecting }));
        } catch (error: any) {
            console.error('Operation failed', error);
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setConnecting(prev => ({ ...prev, [platform]: false }));
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 pb-32 md:pb-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-base text-slate-500 mt-1">Manage your account and connected platforms</p>
                </div>

                {/* Account Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                            <IconUser className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-900">Account</h2>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Email</p>
                                <p className="text-sm font-semibold text-slate-900">{user?.email || 'Not logged in'}</p>
                            </div>
                            <IconChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-xs font-medium text-slate-500">User ID</p>
                                <p className="text-xs font-mono text-slate-600">{user?.id || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                            </svg>
                        </div>
                        <h2 className="text-base font-semibold text-slate-900">Preferences</h2>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Business Name</label>
                            <input
                                type="text"
                                defaultValue={user?.businessName || ''}
                                onBlur={(e) => {
                                    if (e.target.value !== user?.businessName) {
                                        api.patch('/auth/profile', { businessName: e.target.value })
                                            .then(() => toast.success('Business name updated'))
                                            .catch(() => toast.error('Failed to update business name'));
                                    }
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Your Business Name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">AI Reply Language</label>
                            <select
                                value={user?.language || 'en'}
                                onChange={(e) => {
                                    api.patch('/auth/profile', { language: e.target.value })
                                        .then(() => {
                                            toast.success('Language preference updated');
                                            window.location.reload();
                                        })
                                        .catch(() => toast.error('Failed to update language'));
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                                <option value="en">English (Default)</option>
                                <option value="ne">Nepali (नेपाली)</option>
                                <option value="hi">Hindi (हिंदी)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Connected Platforms */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                            <IconLink className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-900">Connected Platforms</h2>
                    </div>

                    <div className="space-y-2">
                        {/* Instagram */}
                        <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between gap-3 border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-all ${connected.instagram ? 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500' : 'bg-slate-300 grayscale'}`}>
                                    <PlatformIcon platform="INSTAGRAM" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-slate-900">Instagram</p>
                                        {connected.instagram && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Active</span>}
                                    </div>
                                    <p className="text-xs text-slate-500">DMs & Comments</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConnect('instagram')}
                                disabled={connecting.instagram}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${connected.instagram
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {connecting.instagram ? '...' : connected.instagram ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>

                        {/* Facebook */}
                        <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between gap-3 border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-all ${connected.facebook ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-slate-300 grayscale'}`}>
                                    <PlatformIcon platform="FACEBOOK" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-slate-900">Facebook</p>
                                        {connected.facebook && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Active</span>}
                                    </div>
                                    <p className="text-xs text-slate-500">Messages & Comments</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConnect('facebook')}
                                disabled={connecting.facebook}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${connected.facebook
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {connecting.facebook ? '...' : connected.facebook ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>

                        {/* WhatsApp */}
                        <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between gap-3 border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-all ${connected.whatsapp ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-slate-300 grayscale'}`}>
                                    <PlatformIcon platform="WHATSAPP" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-slate-900">WhatsApp</p>
                                        {connected.whatsapp && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Active</span>}
                                    </div>
                                    <p className="text-xs text-slate-500">Messages</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConnect('whatsapp')}
                                disabled={connecting.whatsapp}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${connected.whatsapp
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {connecting.whatsapp ? '...' : connected.whatsapp ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
                            <IconShield className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Sign Out</p>
                            <p className="text-xs text-slate-500 mt-0.5">Sign out of your account on this device</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm active:scale-95"
                        >
                            <IconLogout className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
