'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function SettingsPage() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-sm text-gray-500">Manage your account and connected platforms</p>
                    </div>
                    <a href="/dashboard" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                        ← Back to Inbox
                    </a>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Account Info */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-700">Email</p>
                                <p className="text-gray-500">{user?.email || 'Not logged in'}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-700">User ID</p>
                                <p className="text-gray-500 text-sm font-mono">{user?.id || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connected Platforms */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Connected Platforms</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
                                    📸
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">Instagram</p>
                                    <p className="text-sm text-gray-500">DMs & Comments</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                                Connect
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg flex items-center justify-center text-white text-lg">
                                    🎵
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">TikTok</p>
                                    <p className="text-sm text-gray-500">Comments</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                                Connect
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-lg">
                                    💬
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">WhatsApp</p>
                                    <p className="text-sm text-gray-500">Messages</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 text-sm font-medium rounded-full">
                                Coming Soon
                            </span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-700">Sign Out</p>
                            <p className="text-sm text-gray-500">Sign out of your account on this device</p>
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
