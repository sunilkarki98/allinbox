import { AdminSidebar } from '@/components/dashboard/admin-sidebar';
import { ProtectedRoute } from '@/components/protected-route';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-8">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
