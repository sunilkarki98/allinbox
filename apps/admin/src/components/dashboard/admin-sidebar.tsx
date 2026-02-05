'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function AdminSidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: '📊' },
        { name: 'User Management', href: '/dashboard/users', icon: '👥' },
        { name: 'System Settings', href: '/dashboard/settings', icon: '⚙️' },
    ];

    return (
        <div className="w-64 bg-black border-r border-gray-800 min-h-screen flex flex-col">
            <div className="p-6 flex items-center gap-3 border-b border-gray-800">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    A
                </div>
                <span className="font-bold text-white text-lg tracking-tight">Admin Portal</span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <span className="text-xl">🚪</span>
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
