import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { useMsal, MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';

// === TYPES ===
import { type User } from '../../../types/entities';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (userType?: string) => void;
    logout: () => void;
    getToken: () => Promise<string | null>;
    isMock: boolean;
}

// === CONTEXT ===
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === MOCK USERS ===
const MOCK_USERS = {
    producer: {
        id: "user-payments-lead",
        email: "sarah@payments.dev",
        name: "Sarah (Payments Team)",
        azureAdObjectId: "oid-002",
        teams: ['team-payments'],
        leadsTeams: ['team-payments'],
        defaultTeamId: 'team-payments',
        role: 'user' as const,
        username: "sarah@payments.dev",
        adGroups: ['group-payments-dev', 'group-payments-prod', 'group-platform-dev']
    },
    consumer: {
        id: "user-core-dev",
        email: "mike@core.sys",
        name: "Mike (Core Systems)",
        azureAdObjectId: "oid-003",
        teams: ['team-core'],
        leadsTeams: [],
        defaultTeamId: 'team-core',
        role: 'user' as const,
        username: "mike@core.sys",
        adGroups: ['group-core-dev']
    },
    admin: {
        id: "admin-001",
        email: "admin@apim.portal",
        name: "Portal Admin",
        azureAdObjectId: "oid-001",
        teams: ['team-platform', 'team-payments', 'team-core', 'team-cloudops'],
        leadsTeams: ['team-platform'],
        defaultTeamId: 'team-platform',
        role: 'admin' as const,
        username: "admin@apim.portal",
        adGroups: [] // Admin role overrides this anyway
    }
};

// === MOCK IMPLEMENTATION ===
const MockAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedUserType, setSelectedUserType] = useState<keyof typeof MOCK_USERS>('admin');

    // Get current user based on selection
    const baseUser: User = MOCK_USERS[selectedUserType];

    // Access the data store to find real teams
    const allTeams = useInventoryStore((state) => state.teams);

    // Smart Identity Resolution:
    // If we have real teams in the store, try to map the mock user to them.
    const user: User = useMemo(() => {
        if (!allTeams || allTeams.length === 0) return baseUser;

        const resolvedTeams = baseUser.teams.map(mockId => {
            // 1. Try exact match
            const exact = allTeams.find(t => t.id === mockId);
            if (exact) return exact.id;

            // 2. Try name match (e.g. "Payments" in name)
            const nameMatch = allTeams.find(t =>
                t.name.toLowerCase().includes(mockId.replace('team-', '').toLowerCase())
            );
            if (nameMatch) return nameMatch.id;

            // 3. Fallback to the first available team if this is a producer/consumer specific user
            if (baseUser.role === 'admin') return allTeams.map(t => t.id); // Admins get everything
            return allTeams[0].id;
        }).flat();

        return {
            ...baseUser,
            teams: Array.from(new Set(resolvedTeams)),
            // Also resolve leadsTeams
            leadsTeams: baseUser.leadsTeams.length > 0 ? [resolvedTeams[0]] : [],
            defaultTeamId: resolvedTeams[0]
        };
    }, [baseUser, allTeams]);

    const login = React.useCallback((userType?: string) => {
        if (userType && userType in MOCK_USERS) {
            const validUserType = userType as keyof typeof MOCK_USERS;
            setSelectedUserType(validUserType);
            localStorage.setItem('mockUserType', validUserType);
        }
        setIsAuthenticated(true);
    }, []);

    const logout = React.useCallback(() => {
        setIsAuthenticated(false);
    }, []);

    const getToken = React.useCallback(async () => {
        if (!isAuthenticated) return null;
        return "mock-token-xyz";
    }, [isAuthenticated]);

    // Load saved user selection on mount
    useEffect(() => {
        const saved = localStorage.getItem('mockUserType');
        if (saved && saved in MOCK_USERS) {
            setSelectedUserType(saved as keyof typeof MOCK_USERS);
        }
    }, []);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        user: isAuthenticated ? user : null,
        login,
        logout,
        getToken,
        isMock: true
    }), [isAuthenticated, user, login, logout, getToken]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// === MSAL IMPLEMENTATION (REAL) ===
// Initialize the MSAL instance outside component to avoid re-creation
const msalInstance = new PublicClientApplication(msalConfig);
msalInstance.initialize().catch(console.error);

const MsalAuthAdapter: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { instance, accounts } = useMsal();
    const [mockOverride, setMockOverride] = useState<User | null>(null);
    const isAuthenticated = accounts.length > 0 || !!mockOverride;

    // Derived User State
    const account = accounts[0];
    const claims = account?.idTokenClaims as { groups?: string[], roles?: string[] };

    const realUser: User | null = useMemo(() => account ? {
        id: account.localAccountId,
        email: account.username,
        name: account.name || "Unknown",
        azureAdObjectId: account.localAccountId,
        teams: claims?.groups || [],
        leadsTeams: claims?.groups?.filter(g => g.includes('Lead')) || [], // Mock logic: group name contains Lead
        defaultTeamId: claims?.groups?.[0] || '',
        role: claims?.roles?.includes('Scorer.Admin') ? 'admin' : 'user',
        username: account.username
    } : null, [account, claims]);

    const user = mockOverride || realUser;

    const login = React.useCallback((userType?: string) => {
        if (userType && userType in MOCK_USERS) {
            const validUserType = userType as keyof typeof MOCK_USERS;
            setMockOverride(MOCK_USERS[validUserType]);
            return;
        }
        instance.loginPopup(loginRequest).catch(console.error);
    }, [instance]);

    const logout = React.useCallback(() => {
        setMockOverride(null);
        instance.logoutPopup().catch(console.error);
    }, [instance]);

    const getToken = React.useCallback(async () => {
        if (mockOverride) return "mock-token-xyz";
        if (!account) return null;
        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });
            return response.accessToken;
        } catch (error) {
            console.error("Silent token acquisition failed", error);
            // Fallback to interaction if needed, or return null
            return null;
        }
    }, [mockOverride, account, instance]);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        user,
        login,
        logout,
        getToken,
        isMock: false
    }), [isAuthenticated, user, login, logout, getToken]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Wrapper that uses MsalProvider
const RealAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <MsalProvider instance={msalInstance}>
            <MsalAuthAdapter>
                {children}
            </MsalAuthAdapter>
        </MsalProvider>
    );
};


// === MAIN PROVIDER ===
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Master Toggle for Identity: Default to MOCK unless explicitly 'false'
    const authEnv = import.meta.env.VITE_USE_MOCK_AUTH;
    const useMock = authEnv === undefined || String(authEnv).toLowerCase().trim() !== 'false';

    // Global debug handle
    (window as any).__AUTH_MODE = useMock ? 'MOCK' : 'SSO';
    console.log(`[SYS] Identity Provider Check:`, { VITE_USE_MOCK_AUTH: authEnv, finalUseMock: useMock });

    if (useMock) {
        return <MockAuthProvider>{children}</MockAuthProvider>;
    }
    return <RealAuthProvider>{children}</RealAuthProvider>;
};

// === HOOK ===
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
