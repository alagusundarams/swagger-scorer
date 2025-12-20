import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useMsal, MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

// === TYPES ===
import { type User } from '../../../types/entities';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: () => void;
    logout: () => void;
    getToken: () => Promise<string | null>;
    isMock: boolean;
}

// === CONTEXT ===
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === MOCK IMPLEMENTATION ===
const MockAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const user: User = {
        id: "mock-user-id",
        email: "mock@local.dev",
        name: "Mock Developer",
        azureAdObjectId: "mock-azure-ad-id",
        teams: ['team-platform', 'team-payments', 'team-data'],
        leadsTeams: ['team-platform', 'team-payments'], // Mocking lead status for these teams
        defaultTeamId: 'team-platform',
        role: 'admin', // Default to admin for easier dev testing of all features
        username: "mock@local.dev"
    };

    const login = () => {
        console.log("[Mock Auth] Login triggered. Setting isAuthenticated to true.");
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
