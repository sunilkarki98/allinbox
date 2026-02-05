'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Interaction, PostSummary } from '@/lib/mock-data';
import { PostsColumn } from './posts-column';
import { UsersColumn } from './users-column';
import { UserDetailView } from './user-detail';

interface TriageLayoutProps {
    interactions: Interaction[];
    posts?: PostSummary[];
    loading?: boolean;
    totalInteractions?: number;
    onLoadMore?: () => void;
    activeFilter?: FilterType;
    onFilterChange?: (filter: FilterType) => void;
}
import { MessageViewSkeleton } from '../skeletons';

type MobileView = 'posts' | 'users' | 'context';

import { InboxList } from '../inbox-list'; // Verify path: ../inbox-list because layout is in triage/
import { MessageView } from '../message-view';
import { toast } from 'sonner';

type FilterType = 'ALL' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'TIKTOK';


// ... imports

export const TriageLayout: React.FC<TriageLayoutProps> = ({
    interactions,
    posts,
    loading = false,
    totalInteractions = 0,
    onLoadMore,
    activeFilter: externalFilter,
    onFilterChange: onExternalFilterChange
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize from URL or default to 'intent'
    const initialView = (searchParams.get('view') as 'posts' | 'intent') || 'intent';
    const [viewMode, setViewModeState] = useState<'posts' | 'intent'>(initialView);

    // Wrapper to update URL when changing mode
    const setViewMode = (mode: 'posts' | 'intent') => {
        setViewModeState(mode);
        const params = new URLSearchParams(searchParams);
        params.set('view', mode);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // State for Posts View
    const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

    // State for Intent View
    const [selectedInteractionId, setSelectedInteractionId] = useState<string | undefined>();
    const [intentMobileShowDetail, setIntentMobileShowDetail] = useState(false);

    // Mobile Navigation State
    const [mobileView, setMobileView] = useState<MobileView>('posts');

    // Filter & Sort Logic
    const [internalFilter, setInternalFilter] = useState<FilterType>('ALL');

    // Sync external/internal filter
    const activeFilter = externalFilter || internalFilter;
    const setActiveFilter = onExternalFilterChange || setInternalFilter;

    const filteredInteractions = useMemo(() => {
        return activeFilter === 'ALL'
            ? interactions
            : interactions.filter(i => i.platform === activeFilter);
    }, [activeFilter, interactions]);

    const sortedInteractions = useMemo(() => {
        // If we have an external filter (Phase 4), the backend already filtered.
        // We just need to sort if not already sorted.
        return [...interactions].sort((a, b) => {
            if (a.flagUrgent !== b.flagUrgent) return a.flagUrgent ? -1 : 1;
            return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
        });
    }, [interactions]);

    const getEngagementScore = useCallback((username: string): number => {
        const userMsgs = interactions.filter(i => i.senderUsername === username);
        const comments = userMsgs.filter(i => i.type === 'COMMENT').length;
        const dms = userMsgs.filter(i => i.type === 'DM').length;
        const likes = userMsgs.filter(i => i.type === 'LIKE').length;
        const shares = userMsgs.filter(i => i.type === 'SHARE').length;
        const urgent = userMsgs.filter(i => i.flagUrgent).length;
        const buying = userMsgs.filter(i => i.aiIntent === 'purchase_intent').length;
        return (comments * 2) + (dms * 3) + (likes * 1) + (shares * 5) + (urgent * 3) + (buying * 5);
    }, [interactions]);

    const engagementSortedInteractions = useMemo(() => {
        return [...sortedInteractions].sort((a, b) => {
            const scoreA = getEngagementScore(a.senderUsername);
            const scoreB = getEngagementScore(b.senderUsername);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
        });
    }, [sortedInteractions, getEngagementScore]);

    const handleMarkDone = useCallback(() => {
        toast.success('Marked as done!');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'intent') return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'j':
                    if (selectedInteractionId && engagementSortedInteractions.length) {
                        const idx = engagementSortedInteractions.findIndex(i => i.id === selectedInteractionId);
                        if (idx !== -1 && idx < engagementSortedInteractions.length - 1) {
                            handleSelectInteraction(engagementSortedInteractions[idx + 1].id);
                        }
                    }
                    break;
                case 'k':
                    if (selectedInteractionId && engagementSortedInteractions.length) {
                        const idx = engagementSortedInteractions.findIndex(i => i.id === selectedInteractionId);
                        if (idx > 0) {
                            handleSelectInteraction(engagementSortedInteractions[idx - 1].id);
                        }
                    }
                    break;
                case 'e':
                    handleMarkDone();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedInteractionId, engagementSortedInteractions, handleMarkDone]);

    // ... useEffects ...
    // Verify auto-select for intent mode too
    useEffect(() => {
        if (viewMode === 'intent' && !selectedInteractionId && interactions.length > 0) {
            setSelectedInteractionId(interactions[0].id);
        }
    }, [viewMode, interactions, selectedInteractionId]);

    // Handler for selecting interaction in Intent View
    const handleSelectInteraction = (id: string) => {
        setSelectedInteractionId(id);
        // On mobile, show detail view
        if (window.innerWidth < 768) {
            setIntentMobileShowDetail(true);
        }
    };

    // Handler for going back in Intent View mobile
    const handleIntentMobileBack = () => {
        setIntentMobileShowDetail(false);
    };


    if (viewMode === 'intent') {
        const selectedInteraction = interactions.find(i => i.id === selectedInteractionId);

        return (
            <div className="flex w-full h-full bg-gray-50 overflow-hidden relative">
                {/* ===== DESKTOP: 2-Column Layout (md and up) ===== */}
                <div className="hidden md:flex w-full h-full">
                    <InboxList
                        interactions={interactions}
                        processedInteractions={engagementSortedInteractions}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        selectedId={selectedInteractionId}
                        onSelect={setSelectedInteractionId}
                        loading={loading}
                        viewMode="INTENT"
                        onToggleView={() => setViewMode('posts')}
                        totalInteractions={totalInteractions}
                        onLoadMore={onLoadMore}
                    />

                    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-white border-l border-gray-100">
                        {loading ? (
                            <div className="max-w-4xl mx-auto py-8 px-8">
                                <MessageViewSkeleton />
                            </div>
                        ) : selectedInteraction ? (
                            <div className="max-w-4xl mx-auto py-8 px-8">
                                <MessageView interaction={selectedInteraction} onMarkDone={handleMarkDone} />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                Select a message
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== MOBILE: Stacked Drill-Down Navigation (below md) ===== */}
                <div className="flex md:hidden w-full h-full relative">
                    {/* Inbox List View */}
                    <div className={`absolute inset-0 transition-transform duration-300 ease-out bg-white ${intentMobileShowDetail ? '-translate-x-full' : 'translate-x-0'
                        }`}>
                        <InboxList
                            interactions={interactions}
                            processedInteractions={engagementSortedInteractions}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            selectedId={selectedInteractionId}
                            onSelect={handleSelectInteraction}
                            loading={loading}
                            viewMode="INTENT"
                            onToggleView={() => setViewMode('posts')}
                        />
                    </div>

                    {/* Message Detail View */}
                    <div className={`absolute inset-0 transition-transform duration-300 ease-out bg-white ${intentMobileShowDetail ? 'translate-x-0' : 'translate-x-full'
                        }`}>
                        {/* Back Button Header */}
                        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                            <button
                                onClick={handleIntentMobileBack}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Inbox
                            </button>
                        </div>
                        {/* Message Content */}
                        <div className="h-[calc(100%-56px)] overflow-y-auto">
                            {loading ? (
                                <div className="p-4">
                                    <MessageViewSkeleton />
                                </div>
                            ) : selectedInteraction ? (
                                <MessageView interaction={selectedInteraction} onMarkDone={handleMarkDone} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    Select a message
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile Navigation Handlers
    const handleSelectPost = (postId: string) => {
        setSelectedPostId(postId);
        setSelectedUserId(undefined); // Critical: Clear selected lead when changing posts
        if (window.innerWidth < 1280) { // xl breakpoint
            setMobileView('users');
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUserId(userId);
        setMobileView('context'); // Navigate to context on mobile
    };

    const handleBack = () => {
        if (mobileView === 'context') {
            setMobileView('users');
            setSelectedUserId(undefined);
        } else if (mobileView === 'users') {
            setMobileView('posts');
        }
    };

    return (
        <div className="flex w-full h-full bg-gray-50 overflow-hidden relative">
            {/* ===== DESKTOP: 3-Column Layout (xl and up) ===== */}
            {/* ... existing code ... */}
            <div className="hidden xl:flex w-full h-full">
                {/* Column 1: Posts */}
                <PostsColumn
                    interactions={interactions}
                    posts={posts}
                    selectedPostId={selectedPostId}
                    onSelectPost={handleSelectPost}
                    loading={loading}
                    onToggleView={() => setViewMode('intent')}
                />

                {/* Column 2: Users (Leads) */}
                <UsersColumn
                    interactions={interactions}
                    postId={selectedPostId}
                    selectedUserId={selectedUserId}
                    onSelectUser={setSelectedUserId}
                />

                {/* Column 3: Context (User Detail) */}
                <div className="flex-1 min-w-0 h-full">
                    <UserDetailView
                        username={selectedUserId}
                        postId={selectedPostId}
                        interactions={interactions}
                        onClose={() => setSelectedUserId(undefined)}
                    />
                </div>
            </div>

            {/* ===== MOBILE: Stacked Drill-Down Navigation (below xl) ===== */}
            <div className="flex xl:hidden w-full h-full relative">
                {/* Posts View */}
                {/* Posts View */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-out ${mobileView === 'posts' ? 'translate-x-0' : '-translate-x-full'
                    }`}>
                    <PostsColumn
                        interactions={interactions}
                        posts={posts}
                        selectedPostId={selectedPostId}
                        onSelectPost={handleSelectPost}
                        isMobile={true}
                        loading={loading}
                        onToggleView={() => setViewMode('intent')}
                    />
                </div>

                {/* Users View */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-out ${mobileView === 'users' ? 'translate-x-0' :
                    mobileView === 'posts' ? 'translate-x-full' : '-translate-x-full'
                    }`}>
                    <UsersColumn
                        interactions={interactions}
                        postId={selectedPostId}
                        selectedUserId={selectedUserId}
                        onSelectUser={handleSelectUser}
                        isMobile={true}
                        onBack={handleBack}
                    />
                </div>

                {/* Context View */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-out ${mobileView === 'context' ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <UserDetailView
                        username={selectedUserId}
                        postId={selectedPostId}
                        interactions={interactions}
                        onClose={handleBack}
                        isMobile={true}
                    />
                </div>
            </div>
        </div>
    );
};
