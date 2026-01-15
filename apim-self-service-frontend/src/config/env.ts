/**
 * @fileoverview Global Environment Configuration
 * 
 * Centralized location for feature toggles and API URLs.
 * Ensures consistent behavior across MFEs.
 */

// Feature Flag: Enable Mocking (Primarily for Login Component when no backend is available)
export const ENABLE_MOCKS = import.meta.env.VITE_ENABLE_MOCKS === 'true' || true; // Default to true for demo/login stability

export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || '/api/v1',
    WORKFLOW_URL: import.meta.env.VITE_WORKFLOW_API_URL || '/api/v1',
    USE_MOCK_AUTH: import.meta.env.VITE_USE_MOCK_AUTH !== 'false'
};

// ...
console.log(`[SYS] Environment Context:`, {
    API_URL: API_CONFIG.BASE_URL,
    MOCKS_ENABLED: ENABLE_MOCKS,
    MOCK_AUTH: API_CONFIG.USE_MOCK_AUTH
});
