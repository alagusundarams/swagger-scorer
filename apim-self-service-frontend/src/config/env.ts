/**
 * @fileoverview Global Environment Configuration
 * 
 * Centralized location for feature toggles and API URLs.
 * Ensures consistent behavior across MFEs.
 */

// Priority: 1. Strict 'true' | 2. Undefined -> Check if API URL exists | 3. default to true
export const USE_MOCKS = true;

export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || '/api/v1',
    WORKFLOW_URL: import.meta.env.VITE_WORKFLOW_API_URL || '/api/v1',
    USE_MOCK_AUTH: import.meta.env.VITE_USE_MOCK_AUTH === undefined || String(import.meta.env.VITE_USE_MOCK_AUTH).toLowerCase().trim() !== 'false'
};

// Helper for legacy code expecting getApiUrl
export const getApiUrl = () => API_CONFIG.BASE_URL;

export const SSO_DOMAINS = ['company.com', 'example.org'];

console.log(`[SYS] Environment Context:`, {
    API_URL: API_CONFIG.BASE_URL,
    MOCKS_ENABLED: USE_MOCKS,
    MOCK_AUTH: API_CONFIG.USE_MOCK_AUTH
});
