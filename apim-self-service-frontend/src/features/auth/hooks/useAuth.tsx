import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../../../types/commonTypes';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (provider?: string) => Promise<void>;
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
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const login = async (provider?: string) => {
        setIsLoading(true);
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                const role = provider === 'admin' ? 'admin' : 'user';
                const isConsumer = provider === 'consumer';
                setUser({
                    id: 'u1',
                    name: role === 'admin' ? 'Portal Admin' : (isConsumer ? 'Mike Consumer' : 'Sarah Producer'),
                    email: role === 'admin' ? 'admin@company.com' : (isConsumer ? 'mike@core.sys' : 'sarah@payments.dev'),
                    role: role,
                    teams: isConsumer ? ['team-mobile'] : ['team-payments', 'team-core'],
                    azureAdObjectId: 'mock-oid-123',
                    leadsTeams: isConsumer ? [] : ['team-payments', 'team-core'],
                    defaultTeamId: isConsumer ? 'team-mobile' : 'team-payments'
                });
                setIsLoading(false);
                resolve();
            }, 100);
        });
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
