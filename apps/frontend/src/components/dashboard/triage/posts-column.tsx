'use client';

import React, { useMemo, useState } from 'react';
import { Interaction, PostSummary } from '@/lib/mock-data';
import { TriagePostSkeleton } from '../skeletons';
import { LayoutList, Zap } from 'lucide-react';
import { PlatformIcon } from '../platform-badge';
import { PlatformBadge } from '../platform-badge';

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

interface PostsColumnProps {
    interactions: Interaction[];
    posts?: PostSummary[];
    selectedPostId?: string;
    onSelectPost: (postId: string) => void;
    isMobile?: boolean;
    loading?: boolean;
    onToggleView?: () => void;
}

type PlatformFilter = 'ALL' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP';
type TimeFilter = 'TODAY' | 'WEEK' | '15_DAYS' | 'MONTH';

export const PostsColumn: React.FC<PostsColumnProps> = ({
    interactions,
    posts: preFetchedPosts,
    selectedPostId,
    onSelectPost,
    isMobile = false,
    loading = false,
    onToggleView
}) => {
    const [platform, setPlatform] = useState<PlatformFilter>('ALL');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('WEEK');

    // Calculate time filter cutoff
    const getTimeFilterCutoff = (filter: TimeFilter): Date => {
        const now = new Date();
        switch (filter) {
            case 'TODAY':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case 'WEEK':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '15_DAYS':
                return new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            case 'MONTH':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    };

    const rankedPosts = useMemo(() => {
        const cutoff = getTimeFilterCutoff(timeFilter);

        // Path A: Use Pre-fetched Posts (Optimized)
        if (preFetchedPosts && preFetchedPosts.length > 0) {
            return preFetchedPosts
                .filter(p => {
                    const postedAt = new Date(p.postedAt || p.lastActivity);
                    if (postedAt < cutoff) return false;
                    if (platform !== 'ALL' && p.platform !== platform) return false;
                    return true;
                })
                .map(p => {
                    // Normalize to internal structure
                    return {
                        id: p.id,
                        platform: p.platform,
                        image: p.imageUrl,
                        caption: p.caption || 'No Caption',
                        likes: p.likes,
                        shares: p.shares,
                        comments: p.commentsCount,
                        urgentCount: p.urgentCount,
                        lastActivity: new Date(p.lastActivity),
                        // Calculate Rank Score locally for sorting consistency
                        rankScore: (p.commentsCount * 2) + (p.likes * 0.05) + (p.shares * 3) + (p.urgentCount * 5)
                    };
                })
                .sort((a, b) => {
                    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
                    return b.lastActivity.getTime() - a.lastActivity.getTime();
                });
        }

        // Path B: Legacy Client-Side Aggregation (Fallback)
        const posts = new Map<string, {
            id: string,
            platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'WHATSAPP',
            image: string,
            caption: string,
            likes: number,
            shares: number,
            comments: number,
            urgentCount: number,
            rankScore: number,
            lastActivity: Date
        }>();

        interactions.forEach(i => {
            // Filter by time - only include interactions within the selected timeframe
            const receivedAt = new Date(i.receivedAt);
            if (receivedAt < cutoff) return;

            // Use postId first, fallback to postUrl (prefer stable ID)
            const key = i.postId || i.postUrl;
            if (!key) return;

            // Filter by platform
            if (platform !== 'ALL' && i.platform !== platform) return;

            const existing = posts.get(key);
            if (existing) {
                existing.comments++;
                if (i.flagUrgent) existing.urgentCount++;
                // Track last activity for secondary sorting
                if (receivedAt > existing.lastActivity) {
                    existing.lastActivity = receivedAt;
                }
            } else {
                posts.set(key, {
                    id: key, // Use postId or URL as ID
                    platform: i.platform as any,
                    image: i.postImage || '',
                    caption: i.postCaption || 'No Caption',
                    likes: i.postLikes || 0,
                    shares: i.postShares || 0,
                    comments: 1,
                    urgentCount: i.flagUrgent ? 1 : 0,
                    rankScore: 0,
                    lastActivity: receivedAt
                });
            }
        });

        const results = Array.from(posts.values()).map(p => {
            const score = (p.comments * 2) + (p.likes * 0.05) + (p.shares * 3) + (p.urgentCount * 5);
            return { ...p, rankScore: score };
        });

        // Sort by rank score, then by last activity
        return results.sort((a, b) => {
            if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
            return b.lastActivity.getTime() - a.lastActivity.getTime();
        });
    }, [interactions, preFetchedPosts, platform, timeFilter]);

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

                <div className="px-6 pb-4 flex gap-2">
                    {(['ALL', 'INSTAGRAM', 'FACEBOOK'] as PlatformFilter[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p)}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${platform === p
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase().replace('ktok', 'kTok')}
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
                            className={`group relative flex gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 border active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selectedPostId === post.id
                                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className={`absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold shadow-md z-10 ${idx === 0 ? 'bg-amber-400 text-amber-900' :
                                idx === 1 ? 'bg-slate-300 text-slate-700' :
                                    idx === 2 ? 'bg-orange-300 text-orange-800' :
                                        'bg-slate-700 text-white'
                                }`}>
                                {idx + 1}
                            </div>

                            {/* Thumbnail */}
                            <div className="relative w-16 h-16 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                                {post.image ? (
                                    <img src={post.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <PlatformBadge platform={post.platform} showLabel={false} />
                                    </div>
                                )}

                                {/* Platform Icon (Only in ALL view) */}
                                {platform === 'ALL' && (
                                    <div className="absolute bottom-1 right-1 shadow-sm bg-white rounded-full p-0.5">
                                        <PlatformIcon platform={post.platform} className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                                        {post.caption}
                                    </h4>

                                    {/* Chevron */}
                                    <div className="text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5">
                                        <IconChevronRight />
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-slate-500" title="Likes">
                                            <span className="text-rose-500"><IconHeart filled /></span>
                                            <span className="text-xs font-semibold text-slate-700">
                                                {post.likes > 1000 ? (post.likes / 1000).toFixed(1) + 'k' : post.likes}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500" title="Comments">
                                            <span className="text-indigo-500"><IconChat /></span>
                                            <span className="text-xs font-semibold text-slate-700">{post.comments}</span>
                                        </div>
                                    </div>

                                    {/* Urgent Badge */}
                                    {post.urgentCount > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold">
                                            <IconFire /> {post.urgentCount}
                                        </span>
                                    )}
                                </div>
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
