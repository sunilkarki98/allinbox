'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Interaction } from '@/lib/mock-data';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { PlatformIcon } from '../platform-badge';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import {
    IconUsers,
    IconChevronLeft,
    IconChevronRight,
    IconChatBubble,
    IconEnvelope as IconEnvelopeBase,
    IconFire,
    IconCurrencyDollar
} from '@/components/icons';

// Local wrapper for smaller envelope icon
const IconEnvelope = () => <IconEnvelopeBase className="w-3.5 h-3.5" />;

interface UsersColumnProps {
    interactions: Interaction[];
    postId?: string;
    selectedUserId?: string;
    onSelectUser: (userId: string) => void;
    isMobile?: boolean;
    onBack?: () => void;
}

export const UsersColumn: React.FC<UsersColumnProps> = ({
    interactions, // Still accepted for fallback/demo, but we'll try API first
    postId,
    selectedUserId,
    onSelectUser,
    isMobile = false,
    onBack
}) => {
    const { token } = useAuth();
    const [apiLeads, setApiLeads] = useState<any[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);

    useEffect(() => {
        const fetchLeads = async () => {
            if (!postId || !token) {
                setApiLeads([]);
                return;
            }

            setLoadingLeads(true);
            try {
                console.log('[UsersColumn] Fetching leads for:', postId);
                const data = await api.get(`/posts/${postId}/leads`, token);
                console.log('[UsersColumn] Received leads:', data);
                if (Array.isArray(data)) {
                    setApiLeads(data);
                } else {
                    console.warn('[UsersColumn] Expected array but got:', data);
                }
            } catch (err) {
                console.error('[UsersColumn] Error fetching leads:', err);
                // Fallback will happen via the useMemo if apiLeads is empty
            } finally {
                setLoadingLeads(false);
            }
        };

        fetchLeads();
    }, [postId, token]);

    const usersForPost = useMemo(() => {
        if (!postId) return [];

        // If we have API leads, map them to the expected structure
        if (apiLeads.length > 0) {
            return apiLeads.map(l => ({
                username: l.senderUsername,
                displayName: l.leadName || null, // NEW: Capture Display Name
                hasComment: l.interactionCount > 0, // Simplified for now
                hasDM: l.type === 'DM', // Backend sends latest type
                buyIntent: l.aiIntent === 'purchase_intent' || l.purchaseIntentCount > 0,
                isUrgent: l.flagUrgent || l.urgentCount > 0,
                latestMessage: l.contentText,
                latestType: l.type as any,
                latestDisplayTime: new Date(l.receivedAt),
                latestTime: new Date(l.receivedAt),
                platform: l.platform
            })).sort((a, b) => {
                if (a.buyIntent && !b.buyIntent) return -1;
                if (!a.buyIntent && b.buyIntent) return 1;
                if (a.isUrgent && !b.isUrgent) return -1;
                if (!a.isUrgent && b.isUrgent) return 1;
                return b.latestTime.getTime() - a.latestTime.getTime();
            });
        }

        // --- LEGACY FALLBACK (Client-side aggregation) ---
        const userMap = new Map<string, {
            username: string;
            hasComment: boolean;
            hasDM: boolean;
            buyIntent: boolean;
            isUrgent: boolean;
            latestMessage: string;
            latestType: 'DM' | 'COMMENT' | 'LIKE' | 'SHARE';
            latestDisplayTime: Date;
            latestTime: Date;
            platform: string;
            displayName?: string; // NEW
        }>();

        const upsertUser = (i: typeof interactions[0], isComment: boolean, isDM: boolean) => {
            const existing = userMap.get(i.senderUsername);
            const receivedTime = new Date(i.receivedAt);

            if (existing) {
                if (isComment) existing.hasComment = true;
                if (isDM) existing.hasDM = true;
                if (i.aiIntent === 'purchase_intent') existing.buyIntent = true;
                if (i.flagUrgent) existing.isUrgent = true;
                if (receivedTime > existing.latestTime) {
                    existing.latestTime = receivedTime;
                }

                const isMessagePayload = i.type === 'DM' || i.type === 'COMMENT';
                if (isMessagePayload) {
                    if (receivedTime > existing.latestDisplayTime) {
                        existing.latestMessage = i.contentText;
                        existing.latestType = i.type;
                        existing.latestDisplayTime = receivedTime;
                    }
                } else if (!existing.latestMessage) {
                    existing.latestMessage = i.contentText;
                    existing.latestType = i.type;
                }
            } else {
                userMap.set(i.senderUsername, {
                    username: i.senderUsername,
                    hasComment: isComment,
                    hasDM: isDM,
                    buyIntent: i.aiIntent === 'purchase_intent',
                    isUrgent: i.flagUrgent,
                    latestMessage: i.contentText,
                    latestType: i.type,
                    latestDisplayTime: (i.type === 'DM' || i.type === 'COMMENT') ? receivedTime : new Date(0),
                    latestTime: receivedTime,
                    platform: i.platform,
                    displayName: i.leadName || i.senderUsername // Fallback for legacy
                });
            }
        };

        interactions.filter(i => {
            // FIX: Match either direct postId OR sourcePostId (cross-channel).
            // Fallback to URL only if IDs are missing.
            return i.postId === postId || i.sourcePostId === postId || i.postUrl === postId;
        }).forEach(i => {
            const isComment = i.type === 'COMMENT';
            const isDM = i.type === 'DM';
            if (isComment || isDM || i.type === 'LIKE' || i.type === 'SHARE') {
                upsertUser(i, isComment, isDM);
            }
        });

        return Array.from(userMap.values()).sort((a, b) => {
            if (a.buyIntent && !b.buyIntent) return -1;
            if (!a.buyIntent && b.buyIntent) return 1;
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            if (a.hasDM && !b.hasDM) return -1;
            if (!a.hasDM && b.hasDM) return 1;
            return b.latestTime.getTime() - a.latestTime.getTime();
        });
    }, [interactions, postId, apiLeads]);

    return (
        <div className={`${isMobile ? 'w-full' : 'w-[420px]'} bg-white flex flex-col h-full overflow-hidden flex-shrink-0 border-r border-slate-100`}>
            {/* Header */}
            <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
                {/* Back Button (Mobile) */}
                {isMobile && onBack && (
                    <button
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Back to posts"
                    >
                        <IconChevronLeft />
                    </button>
                )}

                <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <IconUsers />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Leads</h2>
                        <p className="text-sm text-slate-500">{usersForPost.length} leads • Priority sorted</p>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Hint */}
            {isMobile && usersForPost.length > 0 && (
                <div className="mx-4 mt-4 flex items-center gap-3 text-sm text-indigo-600 font-medium bg-indigo-50 px-4 py-3 rounded-xl">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                    </svg>
                    <span>Tap a lead to see their messages</span>
                </div>
            )}

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingLeads ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p className="text-sm">Fetching leads...</p>
                    </div>
                ) : usersForPost.map((user) => {
                    // Determine secondary icon based on LATEST interaction
                    const isLatestDM = user.latestType === 'DM';
                    const InteractionIcon = isLatestDM ? IconEnvelope : IconChatBubble;
                    const interactionLabel = isLatestDM ? 'DM' : 'Comment';

                    // Format Time (e.g., 10:42 AM)
                    const timeString = user.latestTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div
                            key={user.username}
                            onClick={() => onSelectUser(user.username)}
                            className={`group relative flex flex-col gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 border text-left active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selectedUserId === user.username
                                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-x-[-2px]'
                                }`}
                        >
                            {/* ROW 1: Header (Avatar + Name + Time) */}
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className={`relative w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner ${selectedUserId === user.username
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : user.buyIntent ? 'bg-emerald-100 text-emerald-700' :
                                        user.isUrgent ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-700'
                                    }`}>
                                    {user.username.charAt(0).toUpperCase()}

                                    {/* Platform Badge (Small) */}
                                    <div className={`absolute -bottom-1 -right-1 rounded-full p-[2px] shadow-sm bg-white`}>
                                        <PlatformIcon platform={user.platform as any} className="w-3 h-3" />
                                    </div>
                                </div>

                                {/* Name & Time */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm font-bold truncate text-slate-900">
                                            {user.username /* Primary: Source Identity (Handle/Phone) */}
                                        </span>
                                        <span className={`text-xs font-medium ${selectedUserId === user.username ? 'text-indigo-600' : 'text-slate-400'
                                            }`}>
                                            {timeString}
                                        </span>
                                    </div>
                                    {/* Secondary: Real Name / CRM Name */}
                                    {user.displayName && user.displayName !== user.username && (
                                        <span className="text-[11px] text-slate-500 truncate -mt-0.5">
                                            {user.displayName}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ROW 2: Message Preview */}
                            <div className={`text-xs leading-relaxed line-clamp-2 ${selectedUserId === user.username ? 'text-slate-700 font-medium' : 'text-slate-600'
                                }`}>
                                <div className="flex items-start gap-1.5">
                                    <span className="mt-0.5 flex-shrink-0">
                                        {user.latestType === 'DM'
                                            ? <Mail className="w-3.5 h-3.5 text-amber-500" />
                                            : <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
                                        }
                                    </span>
                                    <span>{user.latestMessage}</span>
                                </div>
                            </div>

                            {/* ROW 3: Metadata Badges */}
                            <div className="flex items-center gap-2 mt-auto pt-1">
                                {/* Interaction Type Badge */}
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${selectedUserId === user.username
                                    ? 'bg-indigo-200 text-indigo-800'
                                    : isLatestDM
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-slate-600 text-white shadow-sm'
                                    }`}>
                                    {isLatestDM ? <Mail className="w-3 h-3 text-white" /> : <MessageSquare className="w-3 h-3 text-white" />}
                                    {interactionLabel}
                                </div>

                                {/* Intent / Urgency Badges */}
                                {/* Intent / Urgency Badges */}
                                {user.buyIntent && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <IconCurrencyDollar /> Buyer
                                    </div>
                                )}

                                {user.isUrgent && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse bg-red-50 text-red-700 border border-red-100">
                                        <IconFire /> Urgent
                                    </div>
                                )}
                            </div>

                            {/* Chevron (Hover Only) */}
                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${selectedUserId === user.username ? 'text-indigo-400' : 'text-slate-300'
                                }`}>
                                <IconChevronRight />
                            </div>
                        </div>
                    );
                })}

                {usersForPost.length === 0 && (
                    <div className="text-center py-20 px-6">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <IconUsers />
                        </div>
                        <h4 className="text-base font-semibold text-slate-900">
                            {postId ? 'No leads found' : 'Waiting for context'}
                        </h4>
                        <p className="text-sm text-slate-500 mt-2">
                            {postId
                                ? 'No one has interacted with this post yet.'
                                : 'Select a post on the left to see the leads who engaged with it.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
