'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SystemSetting {
    key: string;
    value: string;
    category: string;
    updatedAt: string;
    isMasked?: boolean;
}

const StatusIndicator = ({ isSet, isValid }: { isSet: boolean, isValid: boolean }) => {
    if (!isSet) return <span className="h-2 w-2 rounded-full bg-gray-600 block" title="Not Configured"></span>;
    if (!isValid) return <span className="h-2 w-2 rounded-full bg-red-500 block" title="Invalid/Error"></span>;
    return <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse" title="Valid & Active"></span>;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(false);

    // Form States
    const [geminiModel, setGeminiModel] = useState('');
    const [customGeminiModel, setCustomGeminiModel] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await api.get('/admin/settings');
            setSettings(data.settings);

            const gModel = data.settings.find((s: any) => s.key === 'GEMINI_MODEL');
            if (gModel && gModel.value) {
                const knownModels = ['auto', 'gemini-2.0-flash', 'gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
                if (knownModels.includes(gModel.value)) {
                    setGeminiModel(gModel.value);
                } else {
                    setGeminiModel('custom');
                    setCustomGeminiModel(gModel.value);
                }
            } else {
                setGeminiModel('auto');
            }

        } catch (err) {
            toast.error('Failed to load settings');
        }
    };

    const saveSettingBase = async (key: string, value: string, category: string) => {
        if (!value) return;
        setLoading(true);
        try {
            await api.put('/admin/settings', { key, value, category });
            toast.success(`${key} updated successfully`);
            fetchSettings();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update setting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-white">System Settings</h1>
                <p className="text-gray-400 mt-2">Configure global platform behavior.</p>
            </div>

            <div className="space-y-8">
                {/* AI Configuration */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 text-2xl">🧠</div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Configuration</h2>
                            <p className="text-gray-400 text-sm">Manage LLM Providers and API Keys.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CredentialField
                            label="Gemini API Key"
                            settingKey="GEMINI_API_KEY"
                            category="LLM"
                            settings={settings}
                            onSave={fetchSettings}
                            placeholder="AIzaSy..."
                            isSecret={true}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Gemini Model</label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-4">
                                    <select
                                        value={geminiModel}
                                        onChange={(e) => setGeminiModel(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                    >
                                        <option value="auto">Auto-Detect (Recommended)</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Latest Stable)</option>
                                        <option value="gemini-2.0-pro-exp">Gemini 2.0 Pro Exp (Reasoning)</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy Stable)</option>
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy Fast)</option>
                                        <option value="custom">Custom Model ID...</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            const finalModel = geminiModel === 'custom' ? customGeminiModel : (geminiModel === 'auto' ? '' : geminiModel);
                                            saveSettingBase('GEMINI_MODEL', finalModel, 'LLM');
                                        }}
                                        disabled={loading}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                                {geminiModel === 'custom' && (
                                    <input
                                        type="text"
                                        value={customGeminiModel}
                                        onChange={(e) => setCustomGeminiModel(e.target.value)}
                                        placeholder="e.g. gemini-1.5-flash-8b"
                                        className="w-full px-4 py-2 bg-indigo-900/20 border border-indigo-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                    />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Select a preset or enter a custom Model ID (e.g. from Google AI Studio).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Social Platform Credentials */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 text-2xl">📱</div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Social Platform Credentials</h2>
                            <p className="text-gray-400 text-sm">Configure Client IDs and Secrets for OAuth.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Instagram */}
                        <div className="p-4 border border-gray-800 rounded-xl bg-gray-950/50">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <span className="text-lg">📸</span> Instagram / Meta
                            </h3>
                            <div className="space-y-4">
                                <CredentialField
                                    label="Instagram Client ID"
                                    settingKey="INSTAGRAM_CLIENT_ID"
                                    category="SOCIAL"
                                    settings={settings}
                                    onSave={fetchSettings}
                                    placeholder="123456789..."
                                />
                                <CredentialField
                                    label="Instagram Client Secret"
                                    settingKey="INSTAGRAM_CLIENT_SECRET"
                                    category="SOCIAL"
                                    settings={settings}
                                    onSave={fetchSettings}
                                    placeholder="Secret..."
                                    isSecret={true}
                                />
                                <CredentialField
                                    label="Meta App Secret (Webhooks)"
                                    settingKey="META_APP_SECRET"
                                    category="SOCIAL"
                                    settings={settings}
                                    onSave={fetchSettings}
                                    placeholder="App Secret..."
                                    isSecret={true}
                                />
                            </div>
                        </div>

                        {/* TikTok */}
                        <div className="p-4 border border-gray-800 rounded-xl bg-gray-950/50">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <span className="text-lg">🎵</span> TikTok
                            </h3>
                            <div className="space-y-4">
                                <CredentialField
                                    label="TikTok Client Key"
                                    settingKey="TIKTOK_CLIENT_KEY"
                                    category="SOCIAL"
                                    settings={settings}
                                    onSave={fetchSettings}
                                    placeholder="aw33..."
                                />
                                <CredentialField
                                    label="TikTok Client Secret"
                                    settingKey="TIKTOK_CLIENT_SECRET"
                                    category="SOCIAL"
                                    settings={settings}
                                    onSave={fetchSettings}
                                    placeholder="Secret..."
                                    isSecret={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Webhook Configuration */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-pink-500/10 rounded-lg text-pink-400 text-2xl">🔗</div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Global Webhooks</h2>
                            <p className="text-gray-400 text-sm">Send system-wide events to external services.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CredentialField
                            label="Global Webhook URL"
                            settingKey="GLOBAL_WEBHOOK_URL"
                            category="WEBHOOK"
                            settings={settings}
                            onSave={fetchSettings}
                            placeholder="https://api.external.com/webhook"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper component for managing individual credentials
function CredentialField({
    label,
    settingKey,
    category,
    settings,
    onSave,
    placeholder,
    isSecret = false
}: {
    label: string,
    settingKey: string,
    category: string,
    settings: SystemSetting[],
    onSave: () => void,
    placeholder?: string,
    isSecret?: boolean
}) {
    const setting = settings.find(s => s.key === settingKey);
    const isSet = !!setting;
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!value) return;
        setLoading(true);
        try {
            await api.put('/admin/settings', { key: settingKey, value, category });
            toast.success(`${label} updated`);
            onSave();
            setIsEditing(false);
            setValue('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    if (isSet && !isEditing) {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse" title="Valid & Active"></span>
                        <span className="text-sm text-gray-300 font-mono">
                            {setting?.isMasked ? '••••••••••••••••' : setting?.value}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                    >
                        Edit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div className="flex gap-2">
                <input
                    type={isSecret ? "password" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-2 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus={isEditing}
                />
                <button
                    onClick={handleSave}
                    disabled={loading || !value}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Save
                </button>
                {isEditing && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
            {!isEditing && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-600 block"></span>
                    Not configured
                </p>
            )}
        </div>
    );
}
