import { api } from '../../../api/baseClient';
import { USE_MOCKS } from '../../../config/env';
import { type Product, type Subscription, type Team } from '../../../types/entities';
import { type ApprovalRequest, type ApprovalStatus, type AuditLog } from '../../../types/workflow';

// === MOCK DATA ===
const MOCK_TEAMS: Team[] = [
    { id: 'team-platform', name: 'Platform Engineering', azureAdGroupId: 'group-platform', type: 'producer', description: 'Core platform services and gateway management.', memberCount: 12 },
    { id: 'team-payments', name: 'Payments Squad', azureAdGroupId: 'group-payments', type: 'both', description: 'Payment processing and financial ledger services.', memberCount: 8 },
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

export const getTeams = async () => {
    if (USE_MOCKS) return Promise.resolve({ data: MOCK_TEAMS });
    return api.get<Team[]>('/api-teams');
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
