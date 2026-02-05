'use client';

import React, { useState, useEffect } from 'react';
import { Interaction, PostSummary, DEMO_INTERACTIONS } from '@/lib/mock-data';
import { TriageLayout } from '@/components/dashboard/triage/layout';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function InboxPage() {
    const { user, token } = useAuth();
    const { socket } = useSocket();
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'intent';

    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [demoMode, setDemoMode] = useState(false);

    // Pagination & Filter State
    const [total, setTotal] = useState(0);
    const [platformFilter, setPlatformFilter] = useState<'ALL' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'TIKTOK'>('ALL');
    const [offset, setOffset] = useState(0);
    const LIMIT = 50;

    useEffect(() => {
        // Reset when user changes
        setInteractions([]);
        setOffset(0);
        fetchData(0, platformFilter, view);
    }, [user?.id, view]);

    useEffect(() => {
        if (!socket) return;

        socket.on('interaction_analyzed', (data: any) => {
            setInteractions(prev => prev.map(item => {
                if (item.id === data.id) {
                    return { ...item, ...data };
                }
                return item;
            }));
        });

        socket.on('ingestion_complete', () => {
            fetchData(0, platformFilter, view);
            toast.success('New messages synced!');
        });

        return () => {
            socket.off('interaction_analyzed');
            socket.off('ingestion_complete');
        };
    }, [socket, platformFilter, view]);

    const fetchData = async (currentOffset: number, filter: string, currentView: string) => {
        console.log(`[InboxPage] Fetching data (offset: ${currentOffset}, filter: ${filter})...`);
        try {
            if (user?.id) {
                const sortParam = currentView === 'intent' ? '&sort=PRIORITY' : '';
                const query = `/interactions?limit=${LIMIT}&offset=${currentOffset}${filter !== 'ALL' ? `&platform=${filter}` : ''}${sortParam}`;

                // Fetch interactions AND posts parallelly
                const [intRes, postsData] = await Promise.all([
                    api.get(query, token || undefined),
                    api.get('/posts/summary', token || undefined)
                ]);

                if (intRes && intRes.data) {
                    if (currentOffset === 0) {
                        setInteractions(intRes.data);
                    } else {
                        setInteractions(prev => [...prev, ...intRes.data]);
                    }
                    setTotal(intRes.total);
                    setDemoMode(false);
                }

                if (postsData && Array.isArray(postsData)) {
                    setPosts(postsData);
                }
            } else {
                loadDemoData('Preview mode - connect accounts to see real data');
            }
        } catch (err) {
            console.error('[InboxPage] API Error', err);
            if (currentOffset === 0) {
                loadDemoData('Backend offline - showing demo data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextOffset = offset + LIMIT;
        setOffset(nextOffset);
        fetchData(nextOffset, platformFilter, view);
    };

    const handleFilterChange = (newFilter: any) => {
        setPlatformFilter(newFilter);
        setOffset(0);
        setInteractions([]);
        fetchData(0, newFilter, view);
    };

    const loadDemoData = (message?: string) => {
        setInteractions(DEMO_INTERACTIONS);
        setDemoMode(true);
        if (message) {
            toast.info(message, { duration: 4000, icon: '📋' });
        }
    };

    return (
        <div className="h-full flex flex-col -m-4 md:-m-6">
            {demoMode && (
                <div className="bg-amber-500/90 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-200/50">Demo Mode</Badge>
                        Showing sample data. Connect your accounts in Settings.
                    </span>
                    <button
                        onClick={() => setDemoMode(false)}
                        className="hover:bg-amber-600/20 p-1 rounded transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}
            <div className="flex-1 overflow-hidden">
                <TriageLayout
                    interactions={interactions}
                    posts={posts}
                    loading={loading}
                    totalInteractions={total}
                    onLoadMore={handleLoadMore}
                    activeFilter={platformFilter}
                    onFilterChange={handleFilterChange}
                />
            </div>
        </div>
    );
}
