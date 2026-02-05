'use client';

import { useAuth } from '@/context/auth-context';

export default function AdminDashboardOverview() {
    const { user } = useAuth();

    return (
        <div>
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                <p className="text-gray-400 mt-2">Welcome back, {user?.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">System Status</h3>
                    <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                        Operational
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Quick Actions</h3>
                    <div className="flex gap-2">
                        <button className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                            View Audit Logs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
