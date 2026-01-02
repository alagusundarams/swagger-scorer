import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../../../types/commonTypes';

import { login as apiLogin, logout as apiLogout } from '../api/authClient';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (role?: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    getToken: () => Promise<string>;
    isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider - CORE DOMAIN
 * 
 * Manages identity and session state.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial check (could call /me if backend supported it, for now just load)
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const login = async (role?: string) => {
        setIsLoading(true);
        try {
            // Determine email based on role (simple mapping for demo buttons)
            let email = 'user@company.com';
            if (role === 'admin') email = 'admin@apim.portal';
            if (role === 'consumer') email = 'mike@core.sys';
            if (role === 'producer') email = 'sarah@payments.dev';

            const res = await apiLogin({ email, role });
            setUser(res.data);
        } catch (error) {
            console.error("Login failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
    };

    const getToken = async () => "mock-token";

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            logout,
            isLoading,
            getToken,
            isMock: true
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
