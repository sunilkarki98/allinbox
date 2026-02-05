'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Wrapper component that redirects to login if user is not authenticated.
 * Use this to wrap authenticated pages.
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourPageContent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    // If not loading and no user, return null (will redirect)
    if (!user) {
        return null;
    }

    return <>{children}</>;
}
