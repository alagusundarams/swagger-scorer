import { api } from '../../../api/baseClient';
import { USE_MOCKS } from '../../../config/env';
import { type Product, type Subscription, type Team } from '../../../types/entities';
import { type ApprovalRequest, type ApprovalStatus, type AuditLog } from '../../../types/workflow';

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
    }
];

// === API CALLS ===
export const getProducts = async () => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_PRODUCTS });
    return api.get<Product[]>('/products');
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

export const getSubscriptions = async (token: string) => {
    if (USE_MOCKS) return Promise.resolve({ data: [] });
    return api.get<Subscription[]>('/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const requestProductAccess = async (productId: string, teamId: string, token: string) => {
    return api.post<Subscription>('/subscriptions', { productId, teamId }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateSubscription = async (id: string, state: string, token: string) => {
    return api.patch<Subscription>(`/subscriptions/${id}`, { state }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const getApprovals = async (token: string) => {
    if (USE_MOCKS) return Promise.resolve({ data: [] });
    return api.get<ApprovalRequest[]>('/approvals', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateApproval = (id: string, status: ApprovalStatus, token: string) => {
    return api.patch<ApprovalRequest>(`/approvals/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const getAuditLogs = async (entityId?: string) => {
    return api.get<AuditLog[]>('/audit-logs', { params: { entityId } });
};
