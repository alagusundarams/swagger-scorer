import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useMsal, MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

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
    const [selectedUser, setSelectedUser] = useState<keyof typeof MOCK_USERS>('admin');

    // Get current user based on selection
    const user: User = MOCK_USERS[selectedUser];

    const login = (userType?: string) => {
        if (userType && userType in MOCK_USERS) {
            const validUserType = userType as keyof typeof MOCK_USERS;
            setSelectedUser(validUserType);
            localStorage.setItem('mockUserType', validUserType);
        }
        console.log(`[Mock Auth] Login triggered as ${user.name}. Setting isAuthenticated to true.`);
        setIsAuthenticated(true);
    };

    const logout = () => {
        console.log("[Mock Auth] Logout triggered.");
        setIsAuthenticated(false);
    };

    const getToken = async () => {
        if (!isAuthenticated) return null;
        return "mock-token-xyz";
    };

    // Load saved user selection on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('mockUserType');
        if (saved && saved in MOCK_USERS) {
            setSelectedUser(saved as keyof typeof MOCK_USERS);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user: isAuthenticated ? user : null, login, logout, getToken, isMock: true }}>
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
    const isAuthenticated = accounts.length > 0;

    // Derived User State
    const account = accounts[0];
    const claims = account?.idTokenClaims as { groups?: string[], roles?: string[] };

    const user: User | null = account ? {
        id: account.localAccountId,
        email: account.username,
        name: account.name || "Unknown",
        azureAdObjectId: account.localAccountId,
        teams: claims?.groups || [],
        leadsTeams: claims?.groups?.filter(g => g.includes('Lead')) || [], // Mock logic: group name contains Lead
        defaultTeamId: claims?.groups?.[0] || '',
        role: claims?.roles?.includes('Scorer.Admin') ? 'admin' : 'user',
        username: account.username
    } : null;

    const login = () => {
        instance.loginPopup(loginRequest).catch(console.error);
    };

    const logout = () => {
        instance.logoutPopup().catch(console.error);
    };

    const getToken = async () => {
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
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, getToken, isMock: false }}>
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
