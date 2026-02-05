'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { ProtectedRoute } from '@/components/protected-route';
import { SocketProvider } from '@/context/socket-context';
import { MobileBottomNav } from '@/components/dashboard/mobile-nav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <SocketProvider>
                <div className="flex h-screen overflow-hidden bg-background">
                    <DashboardSidebar />
                    <div className="flex flex-col flex-1 overflow-hidden relative">
                        <DashboardTopbar />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30 pb-20 md:pb-6">
                            {children}
                        </main>
                        <MobileBottomNav />
                    </div>
                </div>
            </SocketProvider>
        </ProtectedRoute>
    );
}
