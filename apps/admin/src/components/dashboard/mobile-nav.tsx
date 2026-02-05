'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
        { href: '/dashboard/customers', label: 'Customers', icon: Users },
        { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-current/10")} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
