'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Inbox,
    Users,
    Settings,
    LogOut,
    LayoutDashboard,
    Key,
    Webhook,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useState } from 'react';

// Tenant Navigation (for SME Owners using the product)
const tenantNavItems = [
    { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
    { href: '/dashboard/customers', label: 'Customers', icon: Users },
    { href: '/dashboard/settings', label: 'Connect Accounts', icon: Settings },
];

// Admin Navigation (for SaaS Owner managing the platform)


export function DashboardSidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // Always show tenant nav now that admin is gone
    const showTenantNav = true;

    const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
            <Link
                href={href}
                className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={label}
            >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
            </Link>
        );
    };

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
                <Link href="/dashboard/inbox" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
                        U
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg text-foreground">
                            UnifiedInbox
                        </span>
                    )}
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {/* ADMIN VIEW */}


                {/* TENANT VIEW */}
                {showTenantNav && (
                    <>
                        <div className={cn("mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider", collapsed && 'sr-only')}>
                            Workspace
                        </div>
                        {tenantNavItems.map((item) => (
                            <NavLink key={item.href} {...item} />
                        ))}
                    </>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border space-y-2">
                {/* Admin Switcher */}


                <Button
                    variant="ghost"
                    className={cn(
                        'w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                        collapsed && 'justify-center'
                    )}
                    onClick={logout}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </Button>
            </div>
        </aside>
    );
}
