import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from './useAuth'; // We need to wrap with provider


// Mock MSAL
vi.mock("@azure/msal-react", () => ({
    useMsal: vi.fn(),
    MsalProvider: ({ children }: any) => <div>{children}</div>
}));


vi.mock("@azure/msal-browser", () => {
    return {
        PublicClientApplication: class {
            initialize = vi.fn().mockResolvedValue(undefined);
            loginPopup = vi.fn();
            logoutPopup = vi.fn();
            acquireTokenSilent = vi.fn();
        }
    };
});


// Mock module for environment variables
vi.mock('vite', () => ({
    importMeta: {
        env: {
            VITE_USE_MOCK_AUTH: 'true' // Default to mock for most tests
        }
    }
}));

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars if needed (using vi.stubEnv in newer vitest, or mocking import.meta)
    });

    it('returns mock user when in mock mode', () => {
        // Need to ensure VITE_USE_MOCK_AUTH is 'true'
        // Since we can't easily change import.meta.env at runtime without more setup,
        // we'll verify the MockAuthProvider path.

        const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isMock).toBe(true);
        expect(result.current.isAuthenticated).toBe(false); // Starts false
        expect(result.current.user).toBeNull();
    });

    it('login sets authenticated state in mock mode', async () => {
        const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.login();
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).not.toBeNull();
        expect(result.current.user?.name).toBe('Mock Developer');
    });

    it('logout clears authenticated state in mock mode', () => {
        const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.login();
        });
        expect(result.current.isAuthenticated).toBe(true);

        act(() => {
            result.current.logout();
        });
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });
});
