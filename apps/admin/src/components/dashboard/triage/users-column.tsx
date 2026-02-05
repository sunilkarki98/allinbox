'use client';

import React, { useMemo } from 'react';
import { Interaction } from '@/lib/mock-data';

// ===== ICONS =====
const IconUsers = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const IconChevronLeft = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const IconChevronRight = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const IconChatBubble = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const IconEnvelope = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const IconFire = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
);

const IconCurrencyDollar = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface UsersColumnProps {
    interactions: Interaction[];
    postId?: string;
    selectedUserId?: string;
    onSelectUser: (userId: string) => void;
    isMobile?: boolean;
    onBack?: () => void;
}

export const UsersColumn: React.FC<UsersColumnProps> = ({
    interactions,
    postId,
    selectedUserId,
    onSelectUser,
    isMobile = false,
    onBack
}) => {
    const usersForPost = useMemo(() => {
        if (!postId) return [];

        const userMap = new Map<string, {
            username: string;
            hasComment: boolean;
            hasDM: boolean;
            buyIntent: boolean;
            isUrgent: boolean;
            latestMessage: string;
            platform: string;
        }>();

        // 1. Find interactions for this post (match by postUrl OR postId)
        interactions.filter(i => {
            const key = i.postUrl || i.postId;
            // If the passed `postId` prop is a URL (which it is from PostsColumn), match against postUrl.
            // If it's an ID, match against postId.
            return key === postId && i.type === 'COMMENT';
        }).forEach(i => {
            userMap.set(i.senderUsername, {
                username: i.senderUsername,
                hasComment: true,
                hasDM: false,
                buyIntent: i.aiIntent === 'purchase_intent',
                isUrgent: i.flagUrgent,
                latestMessage: i.contentText,
                platform: i.platform
            });
        });

        // 2. Check for DMs from these users (Global check)
        userMap.forEach((user, username) => {
            const hasDM = interactions.some(i =>
                i.senderUsername === username && i.type === 'DM'
            );
            if (hasDM) user.hasDM = true;
        });

        return Array.from(userMap.values()).sort((a, b) => {
            if (a.buyIntent && !b.buyIntent) return -1;
            if (!a.buyIntent && b.buyIntent) return 1;
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            if (a.hasDM && !b.hasDM) return -1;
            if (!a.hasDM && b.hasDM) return 1;
            return 0;
        });

    }, [interactions, postId]);

    return (
        <div className={`${isMobile ? 'w-full' : 'w-[340px]'} bg-white flex flex-col h-full overflow-hidden flex-shrink-0 border-r border-slate-100`}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
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
                        <p className="text-sm text-slate-500">{usersForPost.length} active • Priority sorted</p>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {usersForPost.map((user) => (
                    <div
                        key={user.username}
                        onClick={() => onSelectUser(user.username)}
                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selectedUserId === user.username
                            ? 'bg-indigo-50 ring-2 ring-indigo-500'
                            : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                    >
                        {/* Avatar */}
                        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white ${user.buyIntent ? 'bg-emerald-500' :
                            user.isUrgent ? 'bg-red-500' :
                                'bg-indigo-500'
                            }`}>
                            {user.username.charAt(0).toUpperCase()}

                            {/* Online dot */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-semibold text-slate-900">@{user.username}</span>
                                {user.buyIntent && (
                                    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold">
                                        <IconCurrencyDollar /> Buyer
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 truncate mt-1">{user.latestMessage}</p>

                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {user.hasComment && user.hasDM ? (
                                    <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-semibold">
                                        🔗 Comment + DM
                                    </span>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                                            <IconChatBubble /> Comment
                                        </span>
                                        {user.hasDM && (
                                            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-medium">
                                                <IconEnvelope /> DM
                                            </span>
                                        )}
                                    </>
                                )}
                                {user.isUrgent && (
                                    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-medium animate-pulse">
                                        <IconFire /> Urgent
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Chevron */}
                        <div className="text-slate-300">
                            <IconChevronRight />
                        </div>
                    </div>
                ))}

                {usersForPost.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <p className="text-base font-medium">Select a post first</p>
                        <p className="text-sm mt-1">Leads will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};
