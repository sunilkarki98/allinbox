'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEffect } from 'react';

// ===== ICONS =====
const IconUser = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const IconLink = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
);

const IconShield = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
);

const IconInstagram = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

// TikTok Icon Removed

const IconWhatsApp = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const IconLogout = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const IconChevronRight = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

export function SettingsView() {
    const { user, logout } = useAuth();
    const [connecting, setConnecting] = React.useState<Record<string, boolean>>({});
    const [connected, setConnected] = React.useState<Record<string, boolean>>({
        instagram: false,
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
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-base text-slate-500 mt-1">Manage your account and connected platforms</p>
                </div>

                {/* Account Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                            <IconUser />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-4 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Email</p>
                                <p className="text-base font-semibold text-slate-900 mt-0.5">{user?.email || 'Not logged in'}</p>
                            </div>
                            <IconChevronRight />
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500">User ID</p>
                                <p className="text-sm font-mono text-slate-600 mt-0.5">{user?.id || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connected Platforms */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <IconLink />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Connected Platforms</h2>
                    </div>

                    <div className="space-y-3">
                        {/* Instagram */}
                        <div className="p-4 bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all ${connected.instagram ? 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 shadow-pink-500/20' : 'bg-slate-300 shadow-slate-300/20 grayscale'}`}>
                                    <IconInstagram />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-base font-semibold text-slate-900">Instagram</p>
                                        {connected.instagram && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>}
                                    </div>
                                    <p className="text-sm text-slate-500">DMs & Comments</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConnect('instagram')}
                                disabled={connecting.instagram}
                                className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${connected.instagram
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                                    }`}
                            >
                                {connecting.instagram ? 'Connecting...' : connected.instagram ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>

                        {/* TikTok Removed */}

                        {/* WhatsApp */}
                        <div className="p-4 bg-slate-50 rounded-xl opacity-60">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
                                    <IconWhatsApp />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-slate-900">WhatsApp</p>
                                    <p className="text-sm text-slate-500">Messages</p>
                                </div>
                            </div>
                            <div className="w-full py-2.5 bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl text-center cursor-not-allowed">
                                Coming Soon
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600">
                            <IconShield />
                        </div>
                        <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-base font-semibold text-slate-900">Sign Out</p>
                            <p className="text-sm text-slate-500 mt-0.5">Sign out of your account on this device</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 active:scale-95"
                        >
                            <IconLogout />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
