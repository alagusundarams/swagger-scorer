import { api } from '../../../api/baseClient';
import { USE_MOCKS } from '../../../config/env';
import { type Product, type Subscription, type Team, type API, type AppRegistration } from '../../../types/entities';
import { type ApprovalRequest, type ApprovalStatus, type AuditLog } from '../../../types/workflow';

// === CONFIG ===

// === MOCK DATA ===
const MOCK_TEAMS: Team[] = [
    {
        id: 'team-platform',
        name: 'Platform Engineering',
        azureAdGroupId: 'group-platform',
        type: 'producer',
        description: 'Core platform services and gateway management.',
        memberCount: 12,
        adGroupMapping: {
            DEV: 'group-platform-dev',
            QA: 'group-platform-qa',
            STAGE: 'group-platform-stage',
            PROD: 'group-platform-prod'
        }
    },
    {
        id: 'team-payments',
        name: 'Payments Squad',
        azureAdGroupId: 'group-payments',
        type: 'both',
        description: 'Payment processing and financial ledger services.',
        memberCount: 8,
        additionalAdGroups: ['group-payments-legacy-v1', 'group-payments-modern'],
        adGroupMapping: {
            DEV: 'group-payments-dev',
            QA: 'group-payments-qa',
            PROD: 'group-payments-prod'
        }
    },
];

const MOCK_PRODUCTS: Product[] = [
    {
        id: 'prod-001', name: 'payment-gateway', displayName: 'Payment Gateway', version: 'v1.2.0',
        description: 'Unified payment processing API.',
        state: 'published', ownerTeamId: 'team-payments', createdAt: '2023-01-15T00:00:00Z', updatedAt: '2023-11-20T00:00:00Z',
        apis: [], environment: 'PROD', qualityScore: 92, subscriberCount: 12
    },
    {
        id: 'prod-grp-001', name: 'mobile-app-bundle', displayName: 'Mobile App Bundle (GRP)', version: 'v1.0.0', type: 'grp',
        description: 'Consumer-owned GRP product bundling Payment and Identity APIs.',
        state: 'published', ownerTeamId: 'team-mobile', createdAt: '2023-05-10T00:00:00Z', updatedAt: '2023-11-20T00:00:00Z',
        apis: [
            { id: 'api-pay', name: 'payments-api', displayName: 'Payments API', description: 'Core payments', path: '/pay', operations: [], originTeamId: 'team-payments' },
            { id: 'api-id', name: 'identity-api', displayName: 'Identity API', description: 'User auth', path: '/auth', operations: [], originTeamId: 'team-identity' }
        ],
        environment: 'DEV', qualityScore: 85, subscriberCount: 5
    }
];

// === API CALLS ===
export const getProducts = async (environment?: string) => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_PRODUCTS });
    const params = environment ? { environment } : {};
    return api.get<Product[]>('/products', { params });
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (USE_MOCKS) {
        const index = MOCK_PRODUCTS.findIndex(p => p.id === id);
        if (index > -1) {
            MOCK_PRODUCTS[index] = { ...MOCK_PRODUCTS[index], ...updates };
            return Promise.resolve({ data: MOCK_PRODUCTS[index] });
        }
        return Promise.reject(new Error('Product not found'));
    }
    return api.patch<Product>(`/products/${id}`, updates);
};

export const updateAPI = async (apiId: string, updates: Partial<API>) => {
    // Mock implementation for API updates
    console.log(`[Mock] Updating API ${apiId}`, updates);
    return Promise.resolve({ data: { id: apiId, ...updates } });
};

export const getTeams = async () => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_TEAMS });
    return api.get<Team[]>('/api-teams');
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (USE_MOCKS) {
        const teamIndex = MOCK_TEAMS.findIndex(t => t.id === teamId);
        if (teamIndex > -1) {
            MOCK_TEAMS[teamIndex] = { ...MOCK_TEAMS[teamIndex], ...updates };
            return Promise.resolve({ data: MOCK_TEAMS[teamIndex] });
        }
        return Promise.reject(new Error('Team not found'));
    }
    return api.patch<Team>(`/api-teams/${teamId}`, updates);
};

export const createTeam = async (team: Team) => {
    if (USE_MOCKS) {
        MOCK_TEAMS.push(team);
        return Promise.resolve({ data: team });
    }
    return api.post<Team>('/api-teams', team);
};

const MOCK_SUBSCRIPTIONS: Subscription[] = [
    {
        id: 'sub-001', productId: 'prod-001', subscriberTeamId: 'team-payments', state: 'active',
        primaryKey: { name: 'Primary', value: 'a1b2c3d4e5' }, secondaryKey: { name: 'Secondary', value: 'f6g7h8i9j0' },
        createdAt: '2023-06-01T00:00:00Z',
    },
    // GRP Subscription (Producer sees GRP Product as consumer)
    {
        id: 'sub-grp-001', productId: 'prod-001', subscriberTeamId: 'team-mobile', state: 'active',
        primaryKey: { name: 'GRP-Key', value: 'grp-12345-bundle' }, secondaryKey: { name: 'GRP-Sec', value: 'grp-67890-bundle' },
        createdAt: '2023-08-15T00:00:00Z',
        appRegistration: {
            id: 'app-grp-001',
            displayName: 'Mobile App Bundle (GRP)', // Matches GRP Product Name
            clientId: 'client-grp-mobile',
            environment: 'PROD',
            ownerTeamId: 'team-mobile'
        }
    }
];

const MOCK_APPS: AppRegistration[] = [
    {
        id: 'app-001',
        displayName: 'Mobile Checkout App',
        clientId: 'client-8822-mobile',
        environment: 'PROD',
        ownerTeamId: 'team-payments',
        createdAt: '2023-09-01T10:00:00Z'
    }
];

export const getAppRegistrations = async (teamId?: string) => {
    if (USE_MOCKS) {
        if (teamId) return Promise.resolve({ data: MOCK_APPS.filter(a => a.ownerTeamId === teamId) });
        return Promise.resolve({ data: MOCK_APPS });
    }
    return api.get<AppRegistration[]>('/apps', { params: { teamId } });
};

export const addAppRegistration = async (app: Partial<AppRegistration>) => {
    if (USE_MOCKS) {
        const newApp = { ...app, id: `app-${Date.now()}` } as AppRegistration;
        MOCK_APPS.push(newApp);
        return Promise.resolve({ data: newApp });
    }
    return api.post<AppRegistration>('/apps', app);
};

export const getSubscriptions = async (token: string) => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_SUBSCRIPTIONS });
    return api.get<Subscription[]>('/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const requestProductAccess = async (productId: string, teamId: string, token: string, appId?: string, justification?: string) => {
    return api.post<Subscription>('/subscriptions', { productId, teamId, appId, justification }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateSubscription = async (id: string, state: string, token: string) => {
    return api.patch<Subscription>(`/subscriptions/${id}`, { state }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const getApprovals = async (token: string) => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_APPROVALS });
    return api.get<ApprovalRequest[]>('/approvals', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateApproval = (id: string, status: ApprovalStatus, justification: string | undefined, token: string) => {
    console.log(`[Client] updateApproval called for ${id}: ${status} (Reason: ${justification})`);
    return api.patch<ApprovalRequest>(`/approvals/${id}`, { status, justification }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

// === MOCK DATA FOR APPROVALS ===
const MOCK_APPROVALS: ApprovalRequest[] = [];

export const getAuditLogs = async (entityId?: string) => {
    return api.get<AuditLog[]>('/audit-logs', { params: { entityId } });
};

export const requestPromotion = async (productId: string, targetEnv: string, token: string) => {
    if (USE_MOCKS) {
        const product = MOCK_PRODUCTS.find(p => p.id === productId);
        if (!product) return Promise.reject(new Error('Product not found'));

        // Check for existing pending request
        const existing = MOCK_APPROVALS.find(r =>
            r.productId === productId &&
            r.type === 'PROMOTION_REQUEST' &&
            r.status === 'PENDING'
        );

        if (existing) {
            return Promise.reject(new Error('A promotion request is already pending for this product.'));
        }

        // === SMART ROUTING LOGIC ===
        let approverTeamId = product.ownerTeamId;
        const isGrp = product.type === 'grp';

        // 1. GRP Products -> Route to Admin (Platform)
        if (isGrp) {
            approverTeamId = 'team-platform';
            console.log('[System] GRP Promotion Detected. Routing to Admin. notifying API owners...');
            product.apis.forEach(api => {
                if (api.originTeamId) {
                    console.log(`[Notification] Alert sent to Team ${api.originTeamId}: Your API ${api.displayName} is part of a GRP promotion.`);
                }
            });
        }
        // 2. Orphaned Products -> Route to Admin (Platform)
        else {
            const ownerExists = MOCK_TEAMS.find(t => t.id === product.ownerTeamId);
            if (!ownerExists) {
                approverTeamId = 'team-platform';
                console.log('[System] Orphaned Product. Routing to Admin fallback.');
            }
        }

        const newRequest: ApprovalRequest = {
            id: `req-${Date.now()}`,
            type: 'PROMOTION_REQUEST',
            status: 'PENDING',
            approverTeamId: approverTeamId,
            requester: {
                name: 'Alice Developer', // Mock user
                email: 'alice@contoso.com',
                teamId: product.ownerTeamId,
                teamName: 'Payments Squad'
            },
            submittedAt: new Date().toISOString(),
            productId: product.id,
            details: {
                targetName: product.displayName,
                targetId: product.id,
                promotionPath: {
                    source: product.environment as any,
                    target: targetEnv as any
                },
                reason: isGrp ? 'GRP Promotion Request (Admin Review Required)' : 'Ready for next stage validation.'
            }
        };

        MOCK_APPROVALS.unshift(newRequest);
        return Promise.resolve({ data: newRequest });
    }

    return api.post<ApprovalRequest>('/approvals/promotion', { productId, targetEnv }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const getAdminProducts = async (environment?: string) => {
    if (USE_MOCKS) {
        const adminData = Array.from({ length: 42 }).map((_, i) => ({
            id: `admin-api-${i}`,
            name: `ent-api-${i}`,
            displayName: `Enterprise ${['Core', 'Security', 'Data', 'Audit', 'Finance'][i % 5]} API ${i + 1}`,
            description: `Global administrative endpoint for ${['identity management', 'transaction auditing', 'real-time analytics', 'ledger synchronization', 'policy enforcement'][i % 5]} across all production gateways.`,
            version: `v${(i % 3) + 1}.0.${i % 10}`,
            state: (i % 15 === 0 ? 'draft' : 'published'),
            ownerTeamId: i % 2 === 0 ? 'team-cloudops' : 'team-security',
            apis: Array.from({ length: (i % 8) + 1 }),
            qualityScore: 70 + (i % 30),
            subscriberCount: (i * 12) % 200,
            environment: ['DEV', 'QA', 'STAGE', 'PROD'][i % 4],
            createdAt: '2023-03-01',
            updatedAt: '2023-11-21'
        }));
        return Promise.resolve({ data: adminData });
    }
    const params = environment ? { environment } : {};
    return api.get<Product[]>('/admin/products', { params });
};

/**
 * Fetch a unified view of all products and APIs across regions for the Admin dashboard.
 */
export const getGlobalInventory = async (): Promise<{ data: { products: any[]; apis: any[] } }> => {
    // In a real Day 1 scenario, we mostly want real data here
    if (USE_MOCKS) {
        return Promise.resolve({
            data: {
                products: [
                    {
                        name: 'payment-api',
                        displayName: 'Payment Gateway API',
                        type: 'standard',
                        ownerTeamId: 'team-payments',
                        ownerTeamName: 'Payments Squad',
                        deployments: [
                            { environment: 'DEV', state: 'published', gitRepoUrl: 'https://github.com/org/payment-api', managementMode: 'TERRAFORM_MANAGED' },
                            { environment: 'PROD', state: 'published', gitRepoUrl: 'https://github.com/org/payment-api', managementMode: 'TERRAFORM_MANAGED' }
                        ]
                    }
                ],
                apis: [
                    {
                        name: 'authorize-v1',
                        displayName: 'Authorize V1',
                        path: '/v1/auth',
                        deployments: [
                            { environment: 'DEV', productId: 'p1', qualityScore: 85 }
                        ]
                    }
                ]
            }
        });
    }
    return api.get('/admin/global-inventory');
};

export interface PermissionMatrixEntry {
    id?: string;
    productId?: string;
    adGroupId: string;
    adGroupName?: string;
    environment: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    role: 'Reader' | 'Contributor' | 'Admin';
}

export const getPermissionMatrix = async (productId: string): Promise<{ data: PermissionMatrixEntry[] }> => {
    if (USE_MOCKS) {
        return Promise.resolve({
            data: [
                { adGroupId: 'group-platform-dev', adGroupName: 'Platform Devs', environment: 'DEV', role: 'Admin' },
                { adGroupId: 'group-payments-dev', adGroupName: 'Payments Squad', environment: 'DEV', role: 'Contributor' },
                { adGroupId: 'group-payments-prod', adGroupName: 'Payments Squad', environment: 'PROD', role: 'Reader' }
            ]
        });
    }
    return api.get(`/permissions/${productId}`);
};

export const updatePermissionMatrix = async (productId: string, entries: PermissionMatrixEntry[]) => {
    if (USE_MOCKS) {
        console.log(`[Mock] Updating Matrix for ${productId}`, entries);
        return Promise.resolve({ data: entries });
    }
    return api.post(`/permissions/${productId}`, { entries });
};
