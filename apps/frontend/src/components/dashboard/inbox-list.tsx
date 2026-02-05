'use client';

import React, { useState, useMemo } from 'react';
import { Interaction } from '@/lib/mock-data';
import { InboxItemSkeleton } from './skeletons';
import { LayoutList, Zap } from 'lucide-react';
import { PlatformBadge } from './platform-badge';

interface InboxListProps {
    interactions: Interaction[];
    processedInteractions?: Interaction[]; // NEW: From parent (filtered & sorted)
    activeFilter?: FilterType; // NEW
    onFilterChange?: (filter: FilterType) => void; // NEW
    selectedId?: string;
    onSelect: (id: string) => void;
    loading?: boolean;
    viewMode?: 'POST' | 'INTENT';
    onToggleView?: () => void;
    totalInteractions?: number; // Phase 4
    onLoadMore?: () => void; // Phase 4
}

type FilterType = 'ALL' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'TIKTOK';

export const InboxList: React.FC<InboxListProps> = ({
    interactions,
    processedInteractions,
    activeFilter: activeFilterProp = 'ALL',
    onFilterChange,
    selectedId,
    onSelect,
    loading = false,
    viewMode = 'POST',
    onToggleView,
    totalInteractions = 0,
    onLoadMore
}) => {
    const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

    // Use props for filter state
    const activeFilter = activeFilterProp;
    const setActiveFilter = onFilterChange || (() => { });

    // Use processed interactions from parent, or fallback to simple filter for standalone usage
    const filteredInteractions = useMemo(() => {
        if (processedInteractions) return processedInteractions;
        return activeFilter === 'ALL'
            ? interactions
            : interactions.filter(i => i.platform === activeFilter);
    }, [processedInteractions, activeFilter, interactions]);

    // 2. Group by Post (for Post View)
    const groupedByPost = useMemo(() => {
        const posts: Record<string, {
            postUrl: string;
            postImage?: string;
            interactions: Interaction[];
            leads: Record<string, Interaction[]>;
            lastActivity: Date;
            platform: string;
        }> = {};

        filteredInteractions.forEach(interaction => {
            // FIX: Don't lump all DMs into 'direct_messages'. 
            // If no Post context, group by Sender (Treat as 1-on-1 thread).
            const key = interaction.postUrl || `dm_thread_${interaction.senderUsername}`;

            if (!posts[key]) {
                posts[key] = {
                    postUrl: key,
                    postImage: interaction.postImage,
                    interactions: [],
                    leads: {},
                    lastActivity: new Date(0),
                    platform: interaction.postPlatform || interaction.platform // Prefer Post's platform if linked
                };
            }

            posts[key].interactions.push(interaction);

            // Update last activity
            const receivedAt = new Date(interaction.receivedAt);
            if (receivedAt > posts[key].lastActivity) {
                posts[key].lastActivity = receivedAt;
            }

            // Group by Lead (Sender)
            const sender = interaction.senderUsername;
            if (!posts[key].leads[sender]) {
                posts[key].leads[sender] = [];
            }
            posts[key].leads[sender].push(interaction);
        });

        // Convert to array and sort by last activity
        return Object.values(posts).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }, [filteredInteractions]);

    // 3. Sort (Managed by parent in TriageLayout for Intent View)
    // We just pass through filteredInteractions as sortedInteractions for legacy internal logic compatibility
    const sortedInteractions = filteredInteractions;

    // Helper: Should show post context based on platform rules
    const shouldShowPostContext = (item: Interaction): boolean => {
        if (!item.postUrl && !item.postImage) return false;
        if (item.type === 'COMMENT' || item.type === 'LIKE' || item.type === 'SHARE') return true;
        if (item.type === 'DM') {
            // Show context for IG DMs (replies to story/post) OR Cross-channel (WA from IG Ad)
            return (item.platform === 'INSTAGRAM' && !!item.postUrl) ||
                (item.platform === 'WHATSAPP' && !!item.sourcePostId);
        }
        return false;
    };

    // Helper: Check if user has both commented AND DMed
    const hasCrossInteraction = (username: string): boolean => {
        const userMsgs = interactions.filter(i => i.senderUsername === username);
        const hasComment = userMsgs.some(i => i.type === 'COMMENT');
        const hasDM = userMsgs.some(i => i.type === 'DM');
        return hasComment && hasDM;
    };

    // Engagement Sort (Managed by parent)
    const engagementSortedInteractions = processedInteractions || sortedInteractions;

    // Count by platform
    const counts = {
        ALL: totalInteractions > 0 ? totalInteractions : interactions.length,
        INSTAGRAM: interactions.filter(i => i.platform === 'INSTAGRAM').length,
        FACEBOOK: interactions.filter(i => i.platform === 'FACEBOOK').length,
        WHATSAPP: interactions.filter(i => i.platform === 'WHATSAPP').length,
        TIKTOK: interactions.filter(i => i.platform === 'TIKTOK').length,
    };

    const tabs: { key: FilterType; label: string; }[] = [
        { key: 'ALL', label: 'All' },
        { key: 'INSTAGRAM', label: 'IG' },
        { key: 'FACEBOOK', label: 'FB' },
        { key: 'WHATSAPP', label: 'WA' },
        // TikTok removed for Phase 1
    ];
    const togglePost = (postUrl: string) => {
        setExpandedPosts(prev => ({ ...prev, [postUrl]: !prev[postUrl] }));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden border-r border-gray-200 w-full md:w-96 lg:w-[450px] bg-white flex-shrink-0 transition-all duration-300">
            {/* Header */}
            <div className="px-4 py-4 md:p-4 border-b border-gray-100 bg-white sticky top-0 z-20 safe-area-inset-x">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inbox</h2>
                    {/* View Mode Toggle */}
                    <button
                        onClick={onToggleView}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        title={viewMode === 'POST' ? 'Switch to Intent View' : 'Switch to Post View'}
                        aria-label={viewMode === 'POST' ? 'Switch to Intent View' : 'Switch to Post View'}
                    >
                        {viewMode === 'POST' ? (
                            <LayoutList className="w-5 h-5" />
                        ) : (
                            <Zap className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        )}
                    </button>
                </div>

                {/* Channel Filter Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeFilter === tab.key
                                ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            <span>{tab.label}</span>
                            {counts[tab.key] > 0 && tab.key !== 'ALL' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === tab.key
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {counts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-2">
                {loading ? (
                    // Loading Skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                        <InboxItemSkeleton key={i} />
                    ))
                ) : (filteredInteractions.length === 0) && (
                    <div className="flex flex-col items-center justify-center p-8 h-full">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl opacity-50">📭</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">No messages</h3>
                        <p className="text-gray-500 text-sm text-center max-w-[240px]">
                            {activeFilter === 'ALL'
                                ? 'Connect your accounts to start receiving messages directly in your inbox.'
                                : `No ${activeFilter.toLowerCase()} messages found.`}
                        </p>
                        {activeFilter === 'ALL' && (
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-settings'))}
                                className="mt-6 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Connect Accounts
                            </button>
                        )}
                    </div>
                )}

                {/* VIEW MODE: POST VIEW */}
                {viewMode === 'POST' && groupedByPost.map((post) => {
                    const isDirectMessageThread = post.postUrl.startsWith('dm_thread_');
                    // Always expand DM threads by default (they usually only have 1 lead anyway)
                    const isExpanded = expandedPosts[post.postUrl] || isDirectMessageThread;
                    const leadCount = Object.keys(post.leads).length;
                    const msgCount = post.interactions.length;

                    return (
                        <div key={post.postUrl} className="border-b border-gray-100 last:border-0">
                            {/* Post Header */}
                            {!isDirectMessageThread && (
                                <div
                                    onClick={() => togglePost(post.postUrl)}
                                    className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center gap-3 transition-colors"
                                >
                                    {post.postImage ? (
                                        <img src={post.postImage} className="w-10 h-10 rounded-md object-cover border border-gray-200" alt="Post" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
                                            <PlatformBadge platform={post.platform} showLabel={false} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                {post.interactions[0]?.productName || 'Post'}
                                            </h4>
                                            <PlatformBadge platform={post.platform} className="text-[10px] px-1.5 py-0 h-4" />
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {msgCount} messages • {post.lastActivity.toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            )}

                            {/* Leads List */}
                            {isExpanded && Object.entries(post.leads).map(([lead, messages]) => {
                                // Use the most recent message for preview
                                const latestMsg = messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
                                const isSelected = messages.some(m => m.id === selectedId);

                                return (
                                    <div
                                        key={lead}
                                        onClick={() => onSelect(latestMsg.id)}
                                        className={`pl-4 p-3 cursor-pointer hover:bg-amber-100 transition-colors border-l-4 ${isSelected
                                            ? 'bg-emerald-100 border-emerald-500'
                                            : 'bg-amber-50 border-amber-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold relative">
                                                {lead.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-900 truncate">
                                                            {lead}
                                                        </span>
                                                        {latestMsg.leadName && latestMsg.leadName !== lead && (
                                                            <span className="text-[10px] text-gray-500 truncate">
                                                                {latestMsg.leadName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">{new Date(latestMsg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-1 mt-1">{latestMsg.contentText}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* VIEW MODE: INTENT VIEW */}
                {viewMode === 'INTENT' && engagementSortedInteractions.map((item) => {
                    const isBuying = item.aiIntent === 'purchase_intent';
                    const isShipping = item.aiIntent === 'shipping_inquiry';
                    const showPost = shouldShowPostContext(item);
                    const crossInteraction = hasCrossInteraction(item.senderUsername);

                    return (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            role="button"
                            tabIndex={0}
                            className={`p-4 cursor-pointer hover:bg-sky-100 transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 rounded-lg my-1 ${selectedId === item.id
                                ? 'bg-emerald-100 hover:bg-emerald-100 border-l-4 border-emerald-500'
                                : 'border-l-4 border-transparent'
                                } ${!item.isReplied ? 'bg-sky-50' : 'bg-slate-100'} relative overflow-hidden`}
                        >
                            {/* Buying Intent Highlighting */}
                            {isBuying && selectedId !== item.id && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-100 via-transparent to-transparent opacity-50 pointer-events-none" />
                            )}

                            {/* Row 1: Platform + Username + Time */}
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <PlatformBadge platform={item.platform} showLabel={false} className="w-6 h-6 justify-center p-0" />

                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-semibold text-sm tracking-tight truncate max-w-[120px] ${!item.isReplied ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {item.senderUsername}
                                        </span>
                                        {item.leadName && item.leadName !== item.senderUsername && (
                                            <span className="text-[10px] text-gray-400 truncate">
                                                {item.leadName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                    {new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex gap-3">
                                {/* Post Context Thumbnail - Platform Aware */}
                                {showPost && item.postImage && (
                                    <div className="relative flex-shrink-0 w-12 h-12">
                                        <img src={item.postImage} className="w-12 h-12 object-cover rounded-md shadow-sm border border-gray-100" alt="Product" />
                                        {isBuying && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full"></span>
                                        )}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    {/* Message Preview */}
                                    <p className={`text-sm leading-relaxed line-clamp-2 mb-2 ${!item.isReplied ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {item.contentText}
                                    </p>

                                    {/* Badges */}
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {/* Interaction Type Badge - mutually exclusive */}
                                        {crossInteraction ? (
                                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                🔗 Comment + DM
                                            </span>
                                        ) : item.type === 'DM' ? (
                                            <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded cursor-default">
                                                DM
                                            </span>
                                        ) : item.type === 'LIKE' ? (
                                            <span className="text-[9px] font-bold text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded cursor-default border border-pink-100 flex items-center gap-1">
                                                ❤️ Liked
                                            </span>
                                        ) : item.type === 'SHARE' ? (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded cursor-default border border-blue-100 flex items-center gap-1">
                                                🔄 Shared
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded cursor-default">
                                                Comment
                                            </span>
                                        )}

                                        {/* AI Intent Badges */}
                                        {isBuying && (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                💰 Buying
                                            </span>
                                        )}
                                        {isShipping && (
                                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                📦 Shipping
                                            </span>
                                        )}
                                        {item.aiIntent === 'pricing_inquiry' && (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                💵 Price
                                            </span>
                                        )}

                                        {item.flagUrgent && (
                                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                                🔥 Urgent
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Load More Button (Phase 4) */}
                {viewMode === 'INTENT' && interactions.length < totalInteractions && onLoadMore && (
                    <div className="py-6 px-4">
                        <button
                            onClick={onLoadMore}
                            disabled={loading}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : `Load More (${totalInteractions - interactions.length} remaining)`}
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};
