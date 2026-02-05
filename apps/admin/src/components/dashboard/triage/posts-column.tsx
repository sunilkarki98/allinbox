'use client';

import React, { useMemo, useState } from 'react';
import { Interaction } from '@/lib/mock-data';
import { TriagePostSkeleton } from '../skeletons';
import { LayoutList, Zap } from 'lucide-react';

// ===== ICONS (Heroicons-style SVGs) =====
const IconChart = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const IconHeart = ({ filled = false }: { filled?: boolean }) => (
    <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
);

const IconChat = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const IconShare = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
);

const IconChevronRight = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const IconFire = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
);

const IconInstagram = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

// TikTok Icon Removed

interface PostsColumnProps {
    interactions: Interaction[];
    selectedPostId?: string;
    onSelectPost: (postId: string) => void;
    isMobile?: boolean;
    loading?: boolean;
    onToggleView?: () => void;
}

type PlatformFilter = 'ALL' | 'INSTAGRAM';
type TimeFilter = 'TODAY' | 'WEEK' | '15_DAYS' | 'MONTH';

export const PostsColumn: React.FC<PostsColumnProps> = ({
    interactions,
    selectedPostId,
    onSelectPost,
    isMobile = false,
    loading = false,
    onToggleView
}) => {
    const [platform, setPlatform] = useState<PlatformFilter>('ALL');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('WEEK');

    const rankedPosts = useMemo(() => {
        const posts = new Map<string, {
            id: string,
            platform: 'INSTAGRAM',
            image: string,
            caption: string,
            likes: number,
            shares: number,
            comments: number,
            urgentCount: number,
            rankScore: number
        }>();

        interactions.forEach(i => {
            // Use postUrl as the grouping key since DB doesn't have postId
            const key = i.postUrl || i.postId;
            if (!key) return;

            if (platform !== 'ALL' && i.platform !== platform) return;

            const existing = posts.get(key);
            if (existing) {
                existing.comments++;
                if (i.flagUrgent) existing.urgentCount++;
            } else {
                posts.set(key, {
                    id: key, // Use URL as ID if necessary
                    platform: i.platform as 'INSTAGRAM',
                    image: i.postImage || '',
                    caption: i.postCaption || 'No Caption',
                    likes: i.postLikes || 0,
                    shares: i.postShares || 0,
                    comments: 1,
                    urgentCount: i.flagUrgent ? 1 : 0,
                    rankScore: 0
                });
            }
        });

        const results = Array.from(posts.values()).map(p => {
            const score = (p.comments * 2) + (p.likes * 0.05) + (p.shares * 3) + (p.urgentCount * 5);
            return { ...p, rankScore: score };
        });

        return results.sort((a, b) => b.rankScore - a.rankScore);
    }, [interactions, platform]);

    return (
        <div className={`${isMobile ? 'w-full' : 'w-[380px]'} bg-white flex flex-col h-full overflow-hidden flex-shrink-0 border-r border-slate-100`}>
            {/* Header */}
            <div className="border-b border-slate-100">
                {/* Title */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-xl text-white">
                                <IconChart />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Top Posts</h1>
                                <p className="text-sm text-slate-500">Ranked by engagement</p>
                            </div>
                        </div>

                        {/* View Mode Toggle (Post View Active) */}
                        <button
                            onClick={onToggleView}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            title="Switch to Intent View"
                            aria-label="Switch to Intent View"
                        >
                            <LayoutList className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile Navigation Hint */}
                    {isMobile && (
                        <div className="mt-4 flex items-center gap-3 text-sm text-indigo-600 font-medium bg-indigo-50 px-4 py-3 rounded-xl">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                            </svg>
                            <span>Tap a post to see leads</span>
                        </div>
                    )}
                </div>

                {/* Platform Tabs */}
                <div className="px-6 pb-4 flex gap-2">
                    {(['ALL', 'INSTAGRAM'] as PlatformFilter[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${platform === p
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {p === 'ALL' && <span>All</span>}
                            {p === 'INSTAGRAM' && <><IconInstagram /> <span className="hidden sm:inline">Instagram</span></>}

                        </button>
                    ))}
                </div>

                {/* Time Filter */}
                <div className="px-6 py-3 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance</span>
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                        className="bg-white text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="TODAY">Last 24h</option>
                        <option value="WEEK">This Week</option>
                        <option value="15_DAYS">15 Days</option>
                        <option value="MONTH">30 Days</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TriagePostSkeleton key={i} />
                    ))
                ) : (
                    rankedPosts.map((post, idx) => (
                        <div
                            key={post.id}
                            onClick={() => onSelectPost(post.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectPost(post.id);
                                }
                            }}
                            className={`group relative flex gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${selectedPostId === post.id
                                ? 'bg-indigo-100 ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'bg-indigo-50/70 hover:bg-indigo-100/80 shadow-sm border border-indigo-100'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className={`absolute -top-2 -left-2 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shadow-md z-10 ${idx === 0 ? 'bg-amber-400 text-amber-900' :
                                idx === 1 ? 'bg-slate-300 text-slate-700' :
                                    idx === 2 ? 'bg-orange-300 text-orange-800' :
                                        'bg-slate-700 text-white'
                                }`}>
                                {idx + 1}
                            </div>

                            {/* Thumbnail */}
                            <div className="relative w-20 h-20 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                                {post.image ? (
                                    <img src={post.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Platform Icon (Only in ALL view) */}
                                {platform === 'ALL' && (
                                    <div className="absolute bottom-1.5 right-1.5 p-1.5 bg-white rounded-lg shadow-sm">
                                        {post.platform === 'INSTAGRAM' ? (
                                            <span className="text-pink-600"><IconInstagram /></span>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div>
                                    <h4 className="text-base font-semibold text-slate-900 line-clamp-2 leading-snug">
                                        {post.caption}
                                    </h4>
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center gap-5 mt-3">
                                    <div className="flex items-center gap-1.5 text-slate-500" title="Likes">
                                        <span className="text-rose-500"><IconHeart filled /></span>
                                        <span className="text-sm font-semibold text-slate-700">
                                            {post.likes > 1000 ? (post.likes / 1000).toFixed(1) + 'k' : post.likes}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500" title="Comments">
                                        <span className="text-indigo-500"><IconChat /></span>
                                        <span className="text-sm font-semibold text-slate-700">{post.comments}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500" title="Shares">
                                        <span className="text-sky-500"><IconShare /></span>
                                        <span className="text-sm font-semibold text-slate-700">{post.shares}</span>
                                    </div>

                                    {/* Urgent Badge */}
                                    {post.urgentCount > 0 && (
                                        <span className="ml-auto flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold">
                                            <IconFire /> {post.urgentCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Chevron */}
                            <div className="flex items-center text-slate-300 group-hover:text-slate-400 transition-colors">
                                <IconChevronRight />
                            </div>
                        </div>
                    ))
                )}

                {!loading && rankedPosts.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                        <p className="text-base font-medium">No posts found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
