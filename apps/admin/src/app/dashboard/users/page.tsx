'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';

interface Customer {
    id: string;
    email: string;
    businessName: string | null;
    status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
    role: 'CUSTOMER' | 'SUPER_ADMIN';
    subscriptionPlan: 'FREE' | 'PAID' | null;
    trialEndsAt: string | null;
    createdAt: string;
    lastLoginAt: string | null;
}

export default function AdminUsersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomers(1);
    }, []);

    const fetchCustomers = async (pageIdx = 1) => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/customers?page=${pageIdx}&limit=10`);
            setCustomers(response.data);
            setTotalPages(response.meta.totalPages);
            setPage(pageIdx);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        setActionLoading(id);
        try {
            await api.patch(`/admin/customers/${id}/status`, { status: newStatus });
            setCustomers(customers.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
            toast.success(`Customer ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
        } catch (err: any) {
            toast.error('Failed to update status: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const promoteToPaid = async (id: string) => {
        setActionLoading(id);
        try {
            const response = await api.post(`/admin/customers/${id}/promote`, {});
            setCustomers(customers.map(c => c.id === id ? { ...c, ...response.customer } : c));
            toast.success('Customer promoted to PAID plan');
        } catch (err: any) {
            toast.error('Failed to promote: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const extendTrial = async (id: string) => {
        const days = prompt('Extend trial by how many days?', '7');
        if (!days) return;

        setActionLoading(id);
        try {
            const response = await api.post(`/admin/customers/${id}/extend-trial`, { days: parseInt(days) });
            setCustomers(customers.map(c => c.id === id ? { ...c, ...response.customer } : c));
            toast.success(`Trial extended by ${days} days`);
        } catch (err: any) {
            toast.error('Failed to extend trial: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getTrialStatus = (customer: Customer) => {
        if (!customer.trialEndsAt) return null;
        const trialEnd = new Date(customer.trialEndsAt);
        const isExpired = isPast(trialEnd);

        return {
            isExpired,
            text: isExpired
                ? 'Expired ' + formatDistanceToNow(trialEnd, { addSuffix: true })
                : 'Expires ' + formatDistanceToNow(trialEnd, { addSuffix: true })
        };
    };

    if (loading && customers.length === 0) return <div className="text-gray-400">Loading Users...</div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">User Management</h1>
                <p className="text-gray-400 mt-2">View and manage registered tenants.</p>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-xl mb-8">
                    {error}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Registered Customers ({customers.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-950 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Trial</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-sm">
                            {customers.map((customer) => {
                                const trialStatus = getTrialStatus(customer);
                                const isActionLoading = actionLoading === customer.id;

                                return (
                                    <tr key={customer.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{customer.email}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-1">{customer.businessName || 'No business name'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${customer.status === 'ACTIVE'
                                                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                                                : customer.status === 'TRIAL'
                                                    ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                                                    : 'bg-red-900/30 text-red-400 border-red-800'
                                                }`}>
                                                {customer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${customer.subscriptionPlan === 'PAID'
                                                ? 'bg-purple-900/30 text-purple-400 border-purple-800'
                                                : 'bg-gray-800 text-gray-400 border-gray-700'
                                                }`}>
                                                {customer.subscriptionPlan || 'FREE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {trialStatus ? (
                                                <span className={`text-xs ${trialStatus.isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    {trialStatus.text}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {customer.role !== 'SUPER_ADMIN' && (
                                                <>
                                                    {/* Promote Button (only for FREE users) */}
                                                    {customer.subscriptionPlan !== 'PAID' && (
                                                        <button
                                                            onClick={() => promoteToPaid(customer.id)}
                                                            disabled={isActionLoading}
                                                            className="text-xs font-bold px-3 py-1.5 rounded transition-colors bg-purple-900/20 text-purple-400 border border-purple-900/50 hover:bg-purple-900/40 disabled:opacity-50"
                                                        >
                                                            Promote
                                                        </button>
                                                    )}

                                                    {/* Extend Trial Button (only for TRIAL status) */}
                                                    {customer.status === 'TRIAL' && (
                                                        <button
                                                            onClick={() => extendTrial(customer.id)}
                                                            disabled={isActionLoading}
                                                            className="text-xs font-bold px-3 py-1.5 rounded transition-colors bg-blue-900/20 text-blue-400 border border-blue-900/50 hover:bg-blue-900/40 disabled:opacity-50"
                                                        >
                                                            Extend
                                                        </button>
                                                    )}

                                                    {/* Suspend/Activate Button */}
                                                    <button
                                                        onClick={() => toggleStatus(customer.id, customer.status)}
                                                        disabled={isActionLoading}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50 ${customer.status === 'ACTIVE' || customer.status === 'TRIAL'
                                                            ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40'
                                                            : 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40'
                                                            }`}
                                                    >
                                                        {customer.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-800 flex justify-center gap-2">
                        <button
                            onClick={() => fetchCustomers(page - 1)}
                            disabled={page <= 1}
                            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => fetchCustomers(page + 1)}
                            disabled={page >= totalPages}
                            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
