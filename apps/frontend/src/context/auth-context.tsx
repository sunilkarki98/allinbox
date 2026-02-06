'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { Tenant } from '@allinbox/types';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// The User object returned by /auth/me is a subset of Tenant + role
type User = Pick<Tenant, 'id' | 'email' | 'status' | 'businessName'> & {
    role?: string;
    language?: string;
    onboardingCompleted?: boolean;
};

interface AuthContextType {
    user: User | null;
    session: any | null;
    token: string | null;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // 1. Check active session immediately (handles URL hash parsing)
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                await syncUser(session.user, session.access_token);
            }
            setIsLoading(false);
        };
        initSession();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);

            if (session?.user) {
                await syncUser(session.user, session.access_token);
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const syncUser = async (supabaseUser: SupabaseUser, accessToken?: string) => {
        try {
            // We call /auth/me to ensure the backend has synced the user record
            const response = await api.get('/auth/me', accessToken);
            if (response?.user) {
                setUser(response.user);

                // Redirect to onboarding if not completed
                if (!response.user.onboardingCompleted && !window.location.pathname.startsWith('/onboarding')) {
                    router.push('/onboarding');
                }
            }
        } catch (err) {
            console.error('Failed to sync user with backend', err);
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Logout failed', e);
        }
        setUser(null);
        localStorage.removeItem('user');
        router.push('/login');
    };


    return (
        <AuthContext.Provider value={{ user, session, token: session?.access_token || null, logout, isLoading }}>
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
