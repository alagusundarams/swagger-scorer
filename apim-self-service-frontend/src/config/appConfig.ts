/**
 * @fileoverview Frontend Application Configuration
 * 
 * Centralized source of truth for runtime configuration.
 * Maps environment variables to typed properties.
 * 
 * DESIGN PRINCIPLE:
 * Features should import `APP_CONFIG` to access settings.
 * They should NOT access `import.meta.env` directly.
 */

export const APP_CONFIG = {
    // API Connection
    api: {
        baseUrl: import.meta.env.VITE_API_URL || '/api/v1',
        workflowUrl: import.meta.env.VITE_WORKFLOW_API_URL || '/api/v1',
        timeoutMs: 30000,
        mocksEnabled: import.meta.env.VITE_USE_MOCKS === 'true',
        mockAuth: import.meta.env.VITE_USE_MOCK_AUTH !== 'false'
    },

    // Brand & Whitelabeling
    brand: {
        companyName: import.meta.env.VITE_COMPANY_NAME || 'Ionosphere',
        emailSuffix: import.meta.env.VITE_EMAIL_SUFFIX || '@company.com',
        gatewayDomain: import.meta.env.VITE_GATEWAY_DOMAIN || 'ionosphere.io',
        portalUrl: import.meta.env.VITE_PORTAL_URL || 'https://portal.ionosphere.io'
    },

    // External Tools Integration
    externalLinks: {
        serviceNow: import.meta.env.VITE_LINK_SERVICENOW || 'https://service-now.com/request/new',
        portIo: import.meta.env.VITE_LINK_PORT_IO || 'https://getport.io',
        wiki: import.meta.env.VITE_LINK_WIKI || 'https://wiki.internal'
    },

    // Authentication
    auth: {
        clientId: import.meta.env.VITE_AUTH_CLIENT_ID || 'PLACEHOLDER-CLIENT-ID',
        authority: import.meta.env.VITE_AUTH_AUTHORITY || 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin
    },

    // Feature Flags
    features: {
        enableGitOps: import.meta.env.VITE_ENABLE_GITOPS === 'true',
        enableComplianceCheck: true
    }
};

/**
 * Helper to build gateway URLs dynamically
 */
export function getGatewayUrl(env: 'DEV' | 'QA' | 'PROD', version?: string): string {
    const subdomain = env === 'PROD' ? 'api' : `api.${env.toLowerCase()}`;
    const base = `https://${subdomain}.${APP_CONFIG.brand.gatewayDomain}`;
    return version ? `${base}/v${version}` : base;
}
