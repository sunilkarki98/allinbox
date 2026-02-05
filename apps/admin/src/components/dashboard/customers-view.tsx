'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';

// ===== ICONS =====
const IconUsers = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const IconSearch = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const IconDownload = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const IconInstagram = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

// TikTok Icon Removed

const IconPhone = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

const IconMail = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const IconChevronDown = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const IconExternalLink = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);

const IconStar = () => (
    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
);

export interface Customer {
    id: string;
    username: string;
    platform: 'INSTAGRAM' | 'WHATSAPP';
    phone?: string;
    email?: string;
    leadScore: number;
    lastIntent?: string;
    totalInteractions: number;
    firstContactAt: string;
    lastContactAt: string;
    tags?: string[];
}

export const DEMO_CUSTOMERS: Customer[] = [
    {
        id: 'cust-1',
        username: 'fashionista_amy',
        platform: 'INSTAGRAM',
        phone: '9841234567',
        email: 'amy.fashion@gmail.com',
        leadScore: 85,
        lastIntent: 'purchase_intent',
        totalInteractions: 5,
        firstContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        lastContactAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    // Cust 2 removed
    {
        id: 'cust-3',
        username: 'shopaholic_nep',
        platform: 'INSTAGRAM',
        email: 'shopaholic.nepal@yahoo.com',
        leadScore: 40,
        lastIntent: 'shipping_inquiry',
        totalInteractions: 2,
        firstContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        lastContactAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    // Cust 4 removed
];

export function CustomersView() {
    const { token, user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'leadScore' | 'lastContactAt' | 'username'>('leadScore');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Fetch Customers
    React.useEffect(() => {
        const fetchCustomers = async () => {
            try {
                if (user?.id) {
                    const data = await api.get('/customers', token || undefined);
                    // Handle case where API returns error/null but not throw
                    if (data && Array.isArray(data)) {
                        // Map data to match interface if needed
                        setCustomers(data);
                    } else if (user) {
                        // Connected but no customers or API error
                        if (data?.length === 0) {
                            setCustomers([]);
                            // No toast needed, we show empty state
                        }
                    }
                } else {
                    setCustomers(DEMO_CUSTOMERS); // Demo mode
                }
            } catch (err) {
                console.error('Failed to fetch customers', err);
                // Fallback to demo for prototype
                setCustomers(DEMO_CUSTOMERS);
                toast.error('Could not load real customers, showing demo data');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, [user, token]);

    const filteredCustomers = useMemo(() => {
        let result = [...customers];

        // Search filter
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(c =>
                c.username.toLowerCase().includes(lower) ||
                c.phone?.includes(search) ||
                c.email?.toLowerCase().includes(lower)
            );
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'leadScore') {
                cmp = (a.leadScore || 0) - (b.leadScore || 0);
            } else if (sortBy === 'lastContactAt') {
                cmp = new Date(a.lastContactAt).getTime() - new Date(b.lastContactAt).getTime();
            } else {
                cmp = a.username.localeCompare(b.username);
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return result;
    }, [customers, search, sortBy, sortDir]);

    const handleExportCSV = () => {
        const headers = ['Username', 'Platform', 'Phone', 'Email', 'Lead Score', 'Last Intent'];
        const rows = filteredCustomers.map(c => [
            c.username,
            c.platform,
            c.phone || '',
            c.email || '',
            c.leadScore.toString(),
            c.lastIntent || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        a.click();
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (!loading && customers.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                    <div className="text-slate-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No customers yet</h2>
                <p className="text-slate-500 text-center max-w-sm mb-8">
                    Connect your social media accounts to start automatically capturing leads and customer profiles.
                </p>
                {/* Note: In a real app we might redirect to settings, 
                    but here we assume the parent view or sidebar handles navigation 
                    or we add a callback prop to switch tabs */}
                <div className="flex gap-3">
                    <button
                        className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                        onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-settings'))}
                    /* Hacky navigation or we just rely on sidebar */
                    >
                        Connect Accounts
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 md:py-5 bg-white border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white">
                            <IconUsers />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">Customers</h1>
                            <p className="text-sm text-slate-500">
                                {loading ? 'Loading...' : `${filteredCustomers.length} contacts`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors active:scale-95 w-full sm:w-auto"
                    >
                        <IconDownload />
                        <span>Export CSV</span>
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search by username, phone, or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <IconSearch />
                        </div>
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="leadScore">Lead Score</option>
                        <option value="lastContactAt">Last Contact</option>
                        <option value="username">Username</option>
                    </select>

                    <button
                        onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span className={`inline-block transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}>
                            <IconChevronDown />
                        </span>
                    </button>
                </div>
            </div>

            {/* List / Table */}
            <div className="flex-1 overflow-auto p-4">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading customers...</div>
                    ) : (
                        filteredCustomers.map((customer) => (
                            <div key={customer.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${customer.leadScore >= 70 ? 'bg-emerald-500' : customer.leadScore >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                            {customer.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">@{customer.username}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${customer.platform === 'INSTAGRAM' ? 'text-pink-600' : 'text-slate-600'}`}>
                                                    {customer.platform === 'INSTAGRAM' ? <IconInstagram /> : null}
                                                    {customer.platform === 'INSTAGRAM' ? 'IG' : 'WA'}
                                                </span>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-500">{formatDate(customer.lastContactAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${customer.leadScore >= 70 ? 'bg-emerald-500' : customer.leadScore >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${customer.leadScore}%` }} />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">{customer.leadScore}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {customer.phone && (
                                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg hover:bg-slate-200">
                                            <IconPhone /> {customer.phone}
                                        </a>
                                    )}
                                    {customer.email && (
                                        <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg hover:bg-slate-200 truncate max-w-[180px]">
                                            <IconMail /> <span className="truncate">{customer.email}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && customers.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading customers...</td></tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        {/* Customer */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${customer.leadScore >= 70 ? 'bg-emerald-500' :
                                                    customer.leadScore >= 40 ? 'bg-amber-500' :
                                                        'bg-slate-400'
                                                    }`}>
                                                    {customer.username.charAt(0).toUpperCase()}
                                                    {customer.tags?.includes('priority') && (
                                                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                            <IconStar />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-900">@{customer.username}</p>
                                                        {customer.tags?.includes('done') && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                                                                Done
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{customer.totalInteractions} interactions</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Platform */}
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${customer.platform === 'INSTAGRAM'
                                                ? 'bg-pink-100 text-pink-700'
                                                : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {customer.platform === 'INSTAGRAM' ? <IconInstagram /> : null}
                                                {customer.platform === 'INSTAGRAM' ? 'IG' : 'WA'}
                                            </span>
                                        </td>

                                        {/* Phone */}
                                        <td className="px-4 py-4 hidden lg:table-cell">
                                            {customer.phone ? (
                                                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-indigo-600">
                                                    <IconPhone />
                                                    {customer.phone}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-slate-300">—</span>
                                            )}
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-4 hidden lg:table-cell">
                                            {customer.email ? (
                                                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-indigo-600 max-w-[200px] truncate">
                                                    <IconMail />
                                                    <span className="truncate">{customer.email}</span>
                                                </a>
                                            ) : (
                                                <span className="text-sm text-slate-300">—</span>
                                            )}
                                        </td>

                                        {/* Lead Score */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${customer.leadScore >= 70 ? 'bg-emerald-500' :
                                                            customer.leadScore >= 40 ? 'bg-amber-500' :
                                                                'bg-slate-400'
                                                            }`}
                                                        style={{ width: `${customer.leadScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">{customer.leadScore}</span>
                                            </div>
                                        </td>

                                        {/* Last Active */}
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-500">{formatDate(customer.lastContactAt)}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {!loading && filteredCustomers.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <IconUsers />
                            <p className="text-base font-medium mt-4">No customers found</p>
                            <p className="text-sm mt-1">Try adjusting your search</p>
                        </div>
                    )}
                </div>

                {/* Info Banner */}
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-indigo-900">Auto-Capture Enabled</p>
                        <p className="text-sm text-indigo-700 mt-0.5">
                            Phone numbers and emails are automatically extracted from conversations using AI pattern detection.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
