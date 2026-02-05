'use client';

import React, { useState, useMemo } from 'react';
import { Interaction } from '@/lib/mock-data';
import { InboxItemSkeleton } from './skeletons';
import { LayoutList, Zap } from 'lucide-react';

interface InboxListProps {
    interactions: Interaction[];
    selectedId?: string;
    onSelect: (id: string) => void;
    loading?: boolean;
    viewMode?: 'POST' | 'INTENT'; // Controlled prop
    onToggleView?: () => void;
}

type FilterType = 'ALL' | 'INSTAGRAM' | 'WHATSAPP';
type SortType = 'TIME' | 'INTENT';

export const InboxList: React.FC<InboxListProps> = ({
    interactions,
    selectedId,
    onSelect,
    loading = false,
    viewMode = 'POST', // Default to POST if not provided (though in TriageLayout it will be INTENT)
    onToggleView
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    // Removed local viewMode state
    const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

    // 1. Filter
    const filteredInteractions = useMemo(() => {
        return activeFilter === 'ALL'
            ? interactions
            : interactions.filter(i => i.platform === activeFilter);
    }, [activeFilter, interactions]);

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
            const key = interaction.postUrl || 'direct_messages';

            if (!posts[key]) {
                posts[key] = {
                    postUrl: key,
                    postImage: interaction.postImage,
                    interactions: [],
                    leads: {},
                    lastActivity: new Date(0),
                    platform: interaction.platform
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

    // 3. Sort (for Intent View)
    const sortedInteractions = useMemo(() => {
        return [...filteredInteractions].sort((a, b) => {
            // INTENT SORTING LOGIC
            // Priority: Purchase (10) > Price/Shipping (5) > General (1)
            // Modifiers: Urgent (+2)
            const getScore = (i: Interaction) => {
                let score = 0;
                if (i.aiIntent === 'purchase_intent') score += 10;
                else if (i.aiIntent === 'pricing_inquiry') score += 5;
                else if (i.aiIntent === 'shipping_inquiry') score += 5;
                else if (i.aiIntent === 'support_request') score += 5;
                else score += 1;

                if (i.flagUrgent) score += 2;
                return score;
            };

            const scoreA = getScore(a);
            const scoreB = getScore(b);

            if (scoreA !== scoreB) return scoreB - scoreA;
            // Secondary sort by time
            return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
        });
    }, [filteredInteractions]);

    // Helper: Should show post context based on platform rules
    const shouldShowPostContext = (item: Interaction): boolean => {
        if (!item.postUrl) return false;
        if (item.type === 'COMMENT' || item.type === 'LIKE' || item.type === 'SHARE') return true; // Context is key for these
        if (item.type === 'DM') {
            // Only show post for DMs if Instagram with CTF (has postUrl)
            return item.platform === 'INSTAGRAM' && !!item.postUrl;
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

    // Helper: Calculate engagement score for a user
    const getEngagementScore = (username: string): number => {
        const userMsgs = interactions.filter(i => i.senderUsername === username);
        const comments = userMsgs.filter(i => i.type === 'COMMENT').length;
        const dms = userMsgs.filter(i => i.type === 'DM').length;
        const likes = userMsgs.filter(i => i.type === 'LIKE').length;
        const shares = userMsgs.filter(i => i.type === 'SHARE').length;
        const urgent = userMsgs.filter(i => i.flagUrgent).length;
        const buying = userMsgs.filter(i => i.aiIntent === 'purchase_intent').length;
        return (comments * 2) + (dms * 3) + (likes * 1) + (shares * 5) + (urgent * 3) + (buying * 5);
    };

    // Enhanced sorted interactions with engagement ranking
    const engagementSortedInteractions = useMemo(() => {
        return [...sortedInteractions].sort((a, b) => {
            const scoreA = getEngagementScore(a.senderUsername);
            const scoreB = getEngagementScore(b.senderUsername);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
        });
    }, [sortedInteractions, interactions]);

    // Count by platform
    const counts = {
        ALL: interactions.length,
        INSTAGRAM: interactions.filter(i => i.platform === 'INSTAGRAM').length,
        WHATSAPP: interactions.filter(i => i.platform === 'WHATSAPP').length,
    };

    const tabs: { key: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
        {
            key: 'ALL',
            label: 'All',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
            color: 'gray'
        },
        {
            key: 'INSTAGRAM',
            label: 'Instagram',
            icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
            color: 'pink'
        },
        // TikTok removed
        {
            key: 'WHATSAPP',
            label: 'WhatsApp',
            icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
            color: 'green'
        },
    ];

    const togglePost = (postUrl: string) => {
        setExpandedPosts(prev => ({ ...prev, [postUrl]: !prev[postUrl] }));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden border-r border-gray-200 w-full md:w-96 lg:w-[450px] bg-white flex-shrink-0 transition-all duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inbox</h2>
                    {/* View Mode Toggle */}
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
                                ? 'bg-white shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                } ${tab.key === 'WHATSAPP' && activeFilter !== tab.key ? 'opacity-50 grayscale' : ''
                                } ${activeFilter === tab.key && tab.key === 'INSTAGRAM' ? 'text-pink-600' :
                                    activeFilter === tab.key && tab.key === 'WHATSAPP' ? 'text-green-600' :
                                        activeFilter === tab.key ? 'text-gray-900' : ''
                                }`}
                        >
                            <span className={activeFilter === tab.key ? 'opacity-100' : 'opacity-70 grayscale'}>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.key === 'WHATSAPP' && (
                                <span className="ml-[2px] text-[8px] bg-gray-200 text-gray-500 px-1 rounded uppercase tracking-wide">Soon</span>
                            )}
                            {counts[tab.key] > 0 && tab.key !== 'WHATSAPP' && (
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
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {loading ? (
                    // Loading Skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                        <InboxItemSkeleton key={i} />
                    ))
                ) : (filteredInteractions.length === 0 || activeFilter === 'WHATSAPP') && (
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
                {viewMode === 'POST' && activeFilter !== 'WHATSAPP' && groupedByPost.map((post) => {
                    const isDirectMessages = post.postUrl === 'direct_messages';
                    const isExpanded = expandedPosts[post.postUrl] || isDirectMessages;
                    const leadCount = Object.keys(post.leads).length;
                    const msgCount = post.interactions.length;

                    return (
                        <div key={post.postUrl} className="border-b border-gray-100 last:border-0">
                            {/* Post Header */}
                            {!isDirectMessages && (
                                <div
                                    onClick={() => togglePost(post.postUrl)}
                                    className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center gap-3 transition-colors"
                                >
                                    {post.postImage ? (
                                        <img src={post.postImage} className="w-10 h-10 rounded-md object-cover border border-gray-200" alt="Post" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                {post.platform} Post {post.interactions[0]?.productName && <span className="text-gray-500 font-normal"> - {post.interactions[0].productName}</span>}
                                            </h4>
                                            <span className="text-[10px] bg-white border border-gray-200 rounded-full px-2 py-0.5 font-medium text-gray-500">
                                                {leadCount} Leads
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {msgCount} total messages • {post.lastActivity.toLocaleDateString()}
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
                                        onClick={() => onSelect(latestMsg.id)} // Select latest message
                                        className={`pl-4 p-3 cursor-pointer hover:bg-amber-100 transition-colors border-l-4 ${isSelected
                                            ? 'bg-emerald-100 border-emerald-500'
                                            : 'bg-amber-50 border-amber-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm relative">
                                                {lead.slice(0, 2).toUpperCase()}
                                                {latestMsg.leadScore && latestMsg.leadScore > 50 && (
                                                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 border border-white rounded-full flex items-center justify-center">
                                                        <span className="sr-only">High Value</span>
                                                        <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-semibold text-gray-900">@{lead}</p>
                                                    <span className="text-[10px] text-gray-400">{new Date(latestMsg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-1 mt-1">{latestMsg.contentText}</p>

                                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                                    {messages.some(m => m.aiIntent === 'purchase_intent') && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded">Buying</span>
                                                    )}
                                                    {latestMsg.leadTags && latestMsg.leadTags.map(tag => (
                                                        <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-medium rounded border border-slate-200">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-medium rounded">{messages.length} msgs</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* VIEW MODE: INTENT VIEW */}
                {viewMode === 'INTENT' && activeFilter !== 'WHATSAPP' && engagementSortedInteractions.map((item) => {
                    // Smart Inbox Highlights
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect(item.id);
                                }
                            }}
                            className={`p-4 cursor-pointer hover:bg-sky-100 transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${selectedId === item.id
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
                                    {/* Platform Badge */}
                                    {item.platform === 'INSTAGRAM' && (
                                        <span className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                        </span>
                                    )}
                                    {/* TikTok Icon Removed */}
                                    <span className={`font-semibold text-sm tracking-tight truncate max-w-[120px] ${!item.isReplied ? 'text-gray-900' : 'text-gray-500'}`}>
                                        @{item.senderUsername}
                                    </span>
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
            </div>
        </div >
    );
};
