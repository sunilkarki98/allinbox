'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Interaction } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { processAiSuggestion } from '@/lib/ai-helper';
import { PlatformIcon } from '../platform-badge';
import {
    IconChevronLeft,
    IconExternalLink,
    IconClipboard,
    IconCheck,
    IconStar,
    IconChatBubble,
    IconEnvelope,
    IconFire,
    IconCurrencyDollar,
    IconSparkles
} from '@/components/icons';

// Star outline variant (not filled)
const IconStarOutline = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
);



interface UserDetailViewProps {
    username?: string;
    postId?: string;
    interactions: Interaction[];
    onClose: () => void;
    isMobile?: boolean;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({
    username,
    postId,
    interactions,
    onClose,
    isMobile = false
}) => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'DM' | 'COMMENT'>('DM');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Backend contact state
    const [contact, setContact] = useState<any>(null);
    const [isPriority, setIsPriority] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [history, setHistory] = useState<Interaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch contact status and history
    useEffect(() => {
        if (username && token) {
            // Fetch History
            setLoadingHistory(true);
            api.get(`/interactions/user/${username}`, token)
                .then(data => {
                    if (Array.isArray(data)) {
                        setHistory(data);
                        // Infer platform from the first interaction if needed for lookup
                        if (data.length > 0) {
                            const platform = data[0].platform;
                            api.get(`/customers/lookup?username=${username}&platform=${platform}`, token)
                                .then(c => {
                                    setContact(c);
                                    const tags = c.tags || [];
                                    setIsPriority(tags.includes('priority'));
                                    setIsDone(tags.includes('done'));
                                })
                                .catch(() => { });
                        }
                    }
                })
                .catch(err => {
                    console.error('[UserDetailView] Error fetching history:', err);
                })
                .finally(() => setLoadingHistory(false));
        } else {
            // Only clear history if we really have no user selected
            if (activeTab === 'DM' || activeTab === 'COMMENT') {
                setHistory([]);
                setContact(null);
            }
        }
    }, [username, token]);

    const toggleTag = async (tag: string) => {
        if (!contact) {
            toast.error('Cannot update status in demo mode');
            return;
        }

        // Optimistic State
        const wasActive = tag === 'priority' ? isPriority : isDone;
        if (tag === 'priority') setIsPriority(!isPriority);
        if (tag === 'done') setIsDone(!isDone);

        // Calc new tags
        const currentTags = contact.tags || [];
        let newTags;
        if (wasActive) {
            newTags = currentTags.filter((t: string) => t !== tag);
        } else {
            newTags = [...currentTags, tag];
        }

        // Update local contact
        setContact({ ...contact, tags: newTags });

        try {
            await api.patch(`/customers/${contact.id}`, { tags: newTags }, token || undefined);
            toast.success(wasActive ? `Removed ${tag}` : `Marked as ${tag}`);
        } catch (err) {
            console.error('Failed to update tag', err);
            toast.error('Failed to update status');
            // Revert state
            if (tag === 'priority') setIsPriority(wasActive);
            if (tag === 'done') setIsDone(wasActive);
        }
    };

    // Use fetched history instead of props
    const userHistory = useMemo(() => {
        const sourceData = history.length > 0 ? history : interactions.filter(i => i.senderUsername === username);
        return sourceData.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    }, [history, interactions, username]);

    const visibleHistory = useMemo(() => {
        return userHistory.filter(item => item.type === activeTab);
    }, [userHistory, activeTab]);

    const handleOpenInApp = (interaction: Interaction) => {
        let url = '';
        if (interaction.platform === 'INSTAGRAM') {
            url = `https://instagram.com/${username}`;
        } else if (interaction.platform === 'TIKTOK') {
            url = `https://tiktok.com/@${username}`;
        }
        if (url) window.open(url, '_blank');
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!username) {
        return (
            <div className="flex-1 h-full bg-slate-50 flex items-center justify-center p-8">
                <div className="max-w-xs text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-300">
                        <IconChatBubble />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Lead Selected</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        Select a lead from the middle column to view their conversation history and AI-suggested replies.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-10">
                {/* Back Button (Mobile Only) */}
                {isMobile && (
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Go back to list"
                    >
                        <IconChevronLeft />
                    </button>
                )}

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">@{username}</h2>
                        {isPriority && (
                            <span className="text-amber-500">
                                <IconStar className="w-4 h-4" />
                            </span>
                        )}
                        {isDone && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                                Done
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{userHistory.length} interactions</p>
                </div>

                {/* Open in App */}
                <button
                    onClick={() => userHistory[0] && handleOpenInApp(userHistory[0])}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    title="Open in external app"
                >
                    <IconExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open App</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-1 pb-0 flex gap-4 border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('DM')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wide transition-colors relative focus:outline-none ${activeTab === 'DM' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Messages <span className="ml-1 opacity-60">{userHistory.filter(i => i.type === 'DM').length}</span>
                    {activeTab === 'DM' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('COMMENT')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wide transition-colors relative focus:outline-none ${activeTab === 'COMMENT' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Comments <span className="ml-1 opacity-60">{userHistory.filter(i => i.type === 'COMMENT').length}</span>
                    {activeTab === 'COMMENT' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                {loadingHistory ? (
                    <div className="text-center py-20 text-slate-400">
                        <p className="text-xs animate-pulse font-medium">Loading history...</p>
                    </div>
                ) : visibleHistory.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p className="text-xs">No {activeTab === 'DM' ? 'messages' : 'comments'} found</p>
                    </div>
                ) : (
                    visibleHistory.map((item) => {
                        const isContextPost = item.postId === postId;
                        const time = new Date(item.receivedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        // Calculate AI suggestion ONCE per item
                        const smartSuggestion = processAiSuggestion(item);
                        const showSuggestion = smartSuggestion && !item.yourReply && !item.replyText;

                        return (
                            <div
                                key={item.id}
                                className={`${isContextPost ? '' : 'opacity-60 hover:opacity-100'} transition-opacity`}
                            >
                                {/* Message Card */}
                                <div className={`w-full p-3 rounded-xl shadow-sm border relative ${item.type === 'COMMENT'
                                    ? 'bg-slate-100 border-slate-200'
                                    : 'bg-[#fff] border-slate-100' // Cleaner white for DMs
                                    }`}>

                                    {/* Header: Platform Badge + Time */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${item.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-700' :
                                                item.platform === 'FACEBOOK' ? 'bg-blue-100 text-blue-700' :
                                                    item.platform === 'TIKTOK' ? 'bg-slate-200 text-slate-800' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                <PlatformIcon platform={item.platform} className="w-3 h-3" />
                                                {item.platform === 'INSTAGRAM' ? 'IG' :
                                                    item.platform === 'FACEBOOK' ? 'FB' :
                                                        item.platform === 'TIKTOK' ? 'TT' : 'WA'}
                                            </span>

                                            {item.flagUrgent && (
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <IconFire className="w-3 h-3" /> Urgent
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">{time}</span>
                                    </div>

                                    {/* Content */}
                                    <p className="text-sm text-slate-800 leading-snug whitespace-pre-wrap">
                                        {item.contentText}
                                    </p>

                                    {/* Your Reply (from database) */}
                                    {(item.replyText || item.yourReply) && (
                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">↳ Reply Sent</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {item.repliedAt
                                                        ? new Date(item.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : ''
                                                    }
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 bg-emerald-50/50 px-2 py-1.5 rounded-lg border border-emerald-100/50">
                                                {item.replyText || item.yourReply?.text}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* AI Suggestion - MOVED OUTSIDE card */}
                                {showSuggestion && (
                                    <div className="mt-2 ml-4 relative">
                                        {/* Connector Line */}
                                        <div className="absolute -left-4 top-0 bottom-0 w-4 border-l-2 border-b-2 border-slate-200 rounded-bl-xl h-4 translate-y-[-50%]"></div>

                                        <div className="bg-white border border-emerald-100 ring-4 ring-emerald-50 rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <IconSparkles className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-xs font-bold text-emerald-900">Suggested Action</span>
                                                    {item.aiIntent && (
                                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0 rounded font-bold uppercase tracking-wide border border-emerald-100">
                                                            {item.aiIntent.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(smartSuggestion, item.id)}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 ${copiedId === item.id
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200'
                                                        }`}
                                                >
                                                    {copiedId === item.id ? <><IconCheck className="w-3 h-3" /> Copied</> : 'Copy Reply'}
                                                </button>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs text-slate-700 leading-relaxed">
                                                {smartSuggestion}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Actions */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-center gap-3">
                <button
                    onClick={() => toggleTag('priority')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 ${isPriority
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    <IconStar className="w-4 h-4" />
                    {isPriority ? 'Priority' : 'Mark Priority'}
                </button>
                <button
                    onClick={() => toggleTag('done')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDone
                        ? 'bg-slate-800 text-slate-300 shadow-none'
                        : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                        }`}
                >
                    <IconCheck className="w-4 h-4" />
                    {isDone ? 'Resolved' : 'Mark Done'}
                </button>
            </div>
        </div>
    );
};
