'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

export function DashboardTopbar() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

    return (
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center justify-between h-full px-6">
                {/* Search - Placeholder for future implementation */}
                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search messages, users... (Cmd+K)"
                            className="pl-10 bg-muted/50"
                            disabled
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Removed non-functional notification bell */}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-9 w-9 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.email || 'User'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        ID: {user?.id?.slice(0, 8)}...
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push('/dashboard/settings')}
                                className="cursor-pointer"
                            >
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={logout}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
