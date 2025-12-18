/**
 * @fileoverview API Client
 * 
 * Centralized Axios instance for backend API communication.
 * Handles all HTTP requests to the Swagger Scorer backend.
 * 
 * Environment Configuration:
 * - Development: Uses VITE_API_URL or defaults to localhost:3001
 * - Production: Nginx proxies /api to the backend container
 * 
 * @module client
 */

import axios from 'axios';
import { type Product, type Subscription, type Team, type ApprovalRequest, type ApprovalStatus } from '../../../types/entities';

/**
 * Axios instance configured for the Swagger Scorer API (Catalog Service).
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Separate instance for Workflow Service.
 */
const workflowApi = axios.create({
    baseURL: import.meta.env.VITE_WORKFLOW_API_URL || 'http://localhost:3002/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Analysis result returned from the /analyze endpoint.
 */
export interface AnalysisResult {
    score: number;
    status: 'red' | 'amber' | 'green';
    categories: Array<{
        name: string;
        score: number;
        weight: number;
        violationCount: number;
    }>;
    violations: Array<{
        rule: string;
        message: string;
        path: string;
        line: number;
        severity: 'error' | 'warning' | 'info' | 'hint';
        category: string;
    }>;
}

// === ANALYZER ENDPOINTS ===
export const postAnalyze = (spec: string) =>
    api.post<AnalysisResult>('/analyze', { content: spec, format: 'yaml' });

export const saveDraft = (spec: string, token: string, apiTitle?: string) =>
    workflowApi.post<{ success: true; requestId: string }>('/drafts',
        { spec, apiTitle },
        { headers: { Authorization: `Bearer ${token}` } }
    );

export const getLatestDraft = (token: string) =>
    workflowApi.get<{ spec: string; apiTitle: string; updatedAt: string }>('/drafts/latest',
        { headers: { Authorization: `Bearer ${token}` } }
    );

// === MOCK DATA CONSTANTS ===
const MOCK_TEAMS: Team[] = [
    { id: 'team-platform', name: 'Platform Engineering', azureAdGroupId: 'group-platform', type: 'producer', description: 'Core platform services and gateway management.', memberCount: 12 },
    { id: 'team-payments', name: 'Payments Squad', azureAdGroupId: 'group-payments', type: 'producer', description: 'Payment processing and financial ledger services.', memberCount: 8 },
    { id: 'team-data', name: 'Data Science', azureAdGroupId: 'group-data', type: 'consumer', description: 'Analytics and ML model consumers.', memberCount: 15 },
    { id: 'team-checkout', name: 'Checkout Experience', azureAdGroupId: 'group-checkout', type: 'consumer', description: 'Frontend checkout flow team.', memberCount: 6 }
];

const MOCK_PRODUCTS: Product[] = [
    {
        id: 'prod-001', name: 'payment-gateway', displayName: 'Payment Gateway', version: 'v1.2.0',
        description: 'Unified payment processing API supporting Stripe, PayPal, and Adyen.',
        state: 'published', ownerTeamId: 'team-payments', createdAt: '2023-01-15T00:00:00Z', updatedAt: '2023-11-20T00:00:00Z',
        apis: [], environment: 'PROD', qualityScore: 92, subscriberCount: 12
    },
    {
        id: 'prod-002', name: 'identity-service', displayName: 'Identity Service', version: 'v2.0.1',
        description: 'Centralized authentication and authorization service (OAuth2/OIDC).',
        state: 'published', ownerTeamId: 'team-platform', createdAt: '2022-08-10T00:00:00Z', updatedAt: '2023-12-01T00:00:00Z',
        apis: [], environment: 'PROD', qualityScore: 88, subscriberCount: 45
    },
    {
        id: 'prod-003', name: 'audit-log', displayName: 'Audit Log API', version: 'v1.0.0',
        description: 'Immutable ledger for all system transaction events.',
        state: 'published', ownerTeamId: 'team-platform', createdAt: '2023-03-10T00:00:00Z', updatedAt: '2023-03-10T00:00:00Z',
        apis: [], environment: 'PROD', qualityScore: 95, subscriberCount: 8
    },
    {
        id: 'prod-004', name: 'recommendations', displayName: 'Recommendation Engine', version: 'v0.5.0-beta',
        description: 'AI-driven product recommendations based on user history.',
        state: 'published', ownerTeamId: 'team-data', createdAt: '2023-11-01T00:00:00Z', updatedAt: '2023-12-05T00:00:00Z',
        apis: [], environment: 'DEV', qualityScore: 75, subscriberCount: 2
    }
];

const MOCK_SUBSCRIPTIONS: Subscription[] = [
    {
        id: 'sub-001', productId: 'prod-001', subscriberTeamId: 'team-data', state: 'active',
        primaryKey: { name: 'Primary', value: 'sk_live_123456789' }, secondaryKey: { name: 'Secondary', value: 'sk_live_987654321' },
        createdAt: '2023-06-15T00:00:00Z'
    },
    {
        id: 'sub-002', productId: 'prod-002', subscriberTeamId: 'team-payments', state: 'active',
        primaryKey: { name: 'Primary', value: 'sk_live_auth_abc' }, secondaryKey: { name: 'Secondary', value: 'sk_live_auth_xyz' },
        createdAt: '2023-02-20T00:00:00Z'
    }
];

// === CATALOG ENDPOINTS ===
export const getProducts = () => {
    // api.get<Product[]>('/products');
    return Promise.resolve({ data: MOCK_PRODUCTS });
};

export const getTeams = () => {
    // api.get<Team[]>('/api-teams');
    return Promise.resolve({ data: MOCK_TEAMS });
};

// === WORKFLOW/SUBSCRIPTION ENDPOINTS ===
export const getSubscriptions = (token: string) => {
    // workflowApi.get<Subscription[]>('/subscriptions', ...
    console.log(`[MOCK] Fetching subscriptions with token: ${token ? 'PRESENT' : 'MISSING'}`);
    return Promise.resolve({ data: MOCK_SUBSCRIPTIONS });
};

export const requestProductAccess = (productId: string, teamId: string, token: string) => {
    /*
    workflowApi.post<Subscription>('/subscriptions',
        { productId, subscriberTeamId: teamId },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    */
    console.log(`[MOCK] Requesting access to ${productId} for team ${teamId} with token ${token ? 'PRESENT' : 'MISSING'}`);
    const newSub: Subscription = {
        id: `sub-${Date.now()}`,
        productId,
        subscriberTeamId: teamId,
        state: 'pending',
        primaryKey: { name: 'Primary', value: 'pending...' },
        secondaryKey: { name: 'Secondary', value: 'pending...' },
        createdAt: new Date().toISOString()
    };
    return Promise.resolve({ data: newSub });
};

export const updateSubscription = (subscriptionId: string, status: string, token: string) => {
    /*
    workflowApi.put<Subscription>(`/subscriptions/${subscriptionId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    */
    console.log(`[MOCK] Updating subscription ${subscriptionId} to ${status} with token ${token ? 'PRESENT' : 'MISSING'}`);
    const sub = MOCK_SUBSCRIPTIONS.find(s => s.id === subscriptionId);
    return Promise.resolve({ data: sub ? { ...sub, state: status as any } : {} as any });
};

// === MOCK APPROVALS ENDPOINT (For Dashboard Enhancement) ===
export const getApprovals = () => {
    // Simulating a delay to mimic real network request
    const mockApprovals: ApprovalRequest[] = [
        {
            id: 'apr-001',
            type: 'PRODUCT_ONBOARDING',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            requester: {
                name: 'Alice Developer',
                email: 'alice@company.com',
                teamId: 'team-checkout',
                teamName: 'Checkout Service'
            },
            details: {
                targetName: 'Payment Gateway Service',
                targetVersion: 'v1.0.0',
                environment: 'DEV',
                reason: 'Initial onboarding for new payment processing capability.'
            }
        },
        {
            id: 'apr-002',
            type: 'API_ONBOARDING',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            requester: {
                name: 'Bob Architect',
                email: 'bob@company.com',
                teamId: 'team-inventory',
                teamName: 'Inventory Core'
            },
            details: {
                targetName: 'Stock Check API',
                targetVersion: 'v2.1',
                environment: 'QA',
                targetId: 'prod-stock-001'
            }
        },
        {
            id: 'apr-003',
            type: 'MODIFICATION',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            requester: {
                name: 'Charlie DevOps',
                email: 'charlie@company.com',
                teamId: 'team-fulfillment',
                teamName: 'Fulfillment Squad'
            },
            details: {
                targetName: 'Order Fulfillment API',
                targetVersion: 'v3.0.1',
                modificationType: 'HOTFIX',
                diffSummary: 'Fixes critical bug in address validation schema.',
                environment: 'PROD'
            }
        },
        {
            id: 'apr-004',
            type: 'SUBSCRIPTION',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
            requester: {
                name: 'Dave Consumer',
                email: 'dave@company.com',
                teamId: 'team-analytics',
                teamName: 'Data Analytics'
            },
            details: {
                targetName: 'User Profile API',
                targetId: 'prod-user-001',
                environment: 'PROD',
                reason: 'Need access for quarterly user growth report.'
            }
        },
        {
            id: 'apr-005',
            type: 'PROMOTION_REQUEST',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
            requester: {
                name: 'Eve Lead',
                email: 'eve@company.com',
                teamId: 'team-identity',
                teamName: 'Identity Provider'
            },
            details: {
                targetName: 'Auth Service',
                targetVersion: 'v4.0-rc1',
                promotionPath: { source: 'QA', target: 'STAGE' },
                reason: 'Regression testing complete. promoting for UAT.'
            }
        },
        {
            id: 'apr-006',
            type: 'QUOTA_EXTENSION',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
            requester: {
                name: 'Frank Marketing',
                email: 'frank@company.com',
                teamId: 'team-marketing',
                teamName: 'Growth Hacking'
            },
            details: {
                targetName: 'Email Notification API',
                targetId: 'prod-email-001',
                environment: 'PROD',
                requestedQuota: '5000 req/min (Gold Tier)',
                reason: 'Black Friday campaign expected traffic surge.'
            }
        },
        {
            id: 'apr-007',
            type: 'DEPRECATION_REQUEST',
            status: 'PENDING',
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
            requester: {
                name: 'Grace Legacy',
                email: 'grace@company.com',
                teamId: 'team-core',
                teamName: 'Core Systems'
            },
            details: {
                targetName: 'Legacy XML Gateway',
                targetVersion: 'v0.9-beta',
                environment: 'PROD',
                reason: 'End of Life reached. No active consumers observed for 90 days.'
            }
        }
    ];

    return Promise.resolve({ data: mockApprovals });
};

export const updateApproval = (id: string, status: ApprovalStatus, token: string) => {
    console.log(`[MOCK] Updating approval ${id} to ${status} with token ${token ? 'PRESENT' : 'MISSING'}`);
    return Promise.resolve({ data: { id, status } });
};
