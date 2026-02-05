'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

import { Tenant } from '@allinbox/types';

// The User object returned by /auth/me is a subset of Tenant + role
type User = Pick<Tenant, 'id' | 'email' | 'status' | 'businessName'> & {
    role?: string;
    language?: string;
    onboardingCompleted?: boolean;
};

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Validate session with server instead of trusting localStorage
        validateSession();
    }, []);

    const validateSession = async () => {
        try {
            // Call /me endpoint to validate cookie and get user
            const response = await api.get('/auth/me');
            if (response?.user) {
                // WARNING: Frontend is primarily for CUSTOMERS. 
                // We allow SUPER_ADMIN for support/testing but with a notification.
                if (response.user.role === 'SUPER_ADMIN') {
                    import('sonner').then(({ toast }) => toast.info('Logged in as Super Admin. Viewing as Tenant.', {
                        description: 'Use the Admin Portal for management tasks.',
                    }));
                }
                setUser(response.user);
                // Keep localStorage in sync for quick access
                localStorage.setItem('user', JSON.stringify(response.user));

                // Onboarding Check
                if (!response.user.onboardingCompleted && window.location.pathname !== '/onboarding') {
                    router.push('/onboarding');
                }

            } else {
                clearLocalUser();
            }
        } catch (err: any) {
            // Specific check for account suspension
            if (err.message === 'Account suspended') {
                import('sonner').then(({ toast }) => toast.error('Your account has been suspended. Please contact support.', {
                    duration: 10000,
                }));
            }
            // Cookie invalid or expired - clear local state
            // Cookie invalid or expired - clear server cookie to fix middleware loop
            await logout();
        } finally {
            setIsLoading(false);
        }
    };

    const clearLocalUser = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const login = (tokenIgnored: string, newUser: User) => {
        // Token is set as httpOnly cookie by the server
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));

        if (newUser.role === 'SUPER_ADMIN') {
            alert('Super Admins must use the Admin Portal (Port 3002)');
            // Ideally redirect to localhost:3002
            return;
        }

        // Onboarding Check
        if (!newUser.onboardingCompleted) {
            router.push('/onboarding');
            return;
        }

        router.push('/dashboard');
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout', {});
        } catch (e) {
            console.error('Logout failed', e);
        }

        clearLocalUser();
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token: null, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
