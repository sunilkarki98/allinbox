'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { Tenant } from '@allinbox/types';

// The User object returned by /auth/me is a subset of Tenant + role
type User = Pick<Tenant, 'id' | 'email' | 'status'> & { role?: string };

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
        validateSession();
    }, []);

    const validateSession = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response?.user) {
                if (response.user.role !== 'SUPER_ADMIN') {
                    // Not an admin? Get out.
                    console.error('User is not SUPER_ADMIN');
                    logout(); // Force logout
                    return;
                }
                setUser(response.user);
                localStorage.setItem('user', JSON.stringify(response.user));
            } else {
                clearLocalUser();
            }
        } catch (err) {
            clearLocalUser();
        } finally {
            setIsLoading(false);
        }
    };

    const clearLocalUser = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const login = (tokenIgnored: string, newUser: User) => {
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));

        if (newUser.role !== 'SUPER_ADMIN') {
            alert('Access Denied: You are not a Super Admin');
            return;
        }
        router.push('/');
    };

    const logout = async () => {
        try { await api.post('/auth/logout', {}); } catch (e) { }
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
