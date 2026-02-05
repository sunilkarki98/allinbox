'use client';

import React, { useState, useEffect } from 'react';
import { Interaction } from '@/lib/mock-data';
import { PostsColumn } from './posts-column';
import { UsersColumn } from './users-column';
import { UserDetailView } from './user-detail';

interface TriageLayoutProps {
    interactions: Interaction[];
    loading?: boolean;
}
import { MessageViewSkeleton } from '../skeletons';

type MobileView = 'posts' | 'users' | 'context';

import { InboxList } from '../inbox-list'; // Verify path: ../inbox-list because layout is in triage/
import { MessageView } from '../message-view'; // Verify path


// ... imports

export const TriageLayout: React.FC<TriageLayoutProps> = ({ interactions, loading = false }) => {
    // View Mode State - Default to 'posts' (3-column)
    const [viewMode, setViewMode] = useState<'posts' | 'intent'>('posts');
    // Audit said "The 3-Column Mental Model is Broken", so 'intent' is the fix. Let's default to 'intent' or properly 'posts' but with a switch.
    // Let's default to 'posts' to not shock existing users, but make the switch visible.

    // State for Posts View
    const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

    // State for Intent View
    const [selectedInteractionId, setSelectedInteractionId] = useState<string | undefined>();

    // Mobile Navigation State
    const [mobileView, setMobileView] = useState<MobileView>('posts');

    // ... useEffects ...
    // Verify auto-select for intent mode too
    useEffect(() => {
        if (viewMode === 'intent' && !selectedInteractionId && interactions.length > 0) {
            setSelectedInteractionId(interactions[0].id);
        }
    }, [viewMode, interactions, selectedInteractionId]);


    if (viewMode === 'intent') {
        const selectedInteraction = interactions.find(i => i.id === selectedInteractionId);

        return (
            <div className="flex w-full h-full bg-gray-50 overflow-hidden relative">
                {/* Intent View: 2 Columns */}
                <InboxList
                    interactions={interactions}
                    selectedId={selectedInteractionId}
                    onSelect={setSelectedInteractionId}
                    loading={loading}
                    viewMode="INTENT"
                    onToggleView={() => setViewMode('posts')}
                />

                <div className="flex-1 min-w-0 h-full overflow-y-auto bg-white border-l border-gray-100">
                    {loading ? (
                        <div className="max-w-4xl mx-auto py-8 px-8">
                            <MessageViewSkeleton />
                        </div>
                    ) : selectedInteraction ? (
                        <div className="max-w-4xl mx-auto py-8 px-8">
                            <MessageView interaction={selectedInteraction} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Select a message
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Mobile Navigation Handlers
    const handleSelectPost = (postId: string) => {
        setSelectedPostId(postId);
        setMobileView('users'); // Navigate to users on mobile
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
            {/* ===== DESKTOP: 3-Column Layout (md and up) ===== */}
            {/* ... existing code ... */}
            <div className="hidden md:flex w-full h-full">
                {/* Column 1: Posts */}
                <PostsColumn
                    interactions={interactions}
                    selectedPostId={selectedPostId}
                    onSelectPost={setSelectedPostId}
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

            {/* ===== MOBILE: Stacked Drill-Down Navigation (below md) ===== */}
            <div className="flex md:hidden w-full h-full relative">
                {/* Posts View */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-out ${mobileView === 'posts' ? 'translate-x-0' : '-translate-x-full'
                    }`}>
                    <PostsColumn
                        interactions={interactions}
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
