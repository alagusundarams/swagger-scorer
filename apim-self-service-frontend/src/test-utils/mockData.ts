/**
 * Mock Data for Tests
 * 
 * Provides realistic mock data for all domain entities.
 * Use these mocks in tests to ensure consistency.
 */

import type { Team, Product, Subscription, API, ApprovalRequest, Environment } from '../shared/types/domain';

/**
 * Mock Teams
 */
export const mockTeams: Team[] = [
    {
        id: 'team-platform',
        name: 'Platform Engineering',
        azureAdGroupId: 'ad-group-platform',
        type: 'producer',
        description: 'Core platform and infrastructure APIs',
        memberCount: 12,
        additionalAdGroups: ['ad-group-platform-readonly'],
    },
    {
        id: 'team-mobile',
        name: 'Mobile Team',
        azureAdGroupId: 'ad-group-mobile',
        type: 'consumer',
        description: 'Mobile app development team',
        memberCount: 8,
    },
    {
        id: 'team-analytics',
        name: 'Analytics Team',
        azureAdGroupId: 'ad-group-analytics',
        type: 'both',
        description: 'Data analytics and reporting',
        memberCount: 15,
        additionalAdGroups: ['ad-group-analytics-dev', 'ad-group-analytics-qa'],
    },
];

/**
 * Mock Environments
 */
export const mockEnvironments: Environment[] = ['dev', 'qa', 'prod'];

/**
 * Mock Products
 */
export const mockProducts: Product[] = [
    {
        id: 'prod-user-api',
        name: 'User API',
        displayName: 'User Management API',
        description: 'Core user management and authentication API',
        version: '2.1.0',
        ownerTeamId: 'team-platform',
        ownerAdGroupId: 'ad-group-platform',
        environment: 'prod',
        qualityScore: 85,
        adoptionMetrics: {
            totalSubscribers: 24,
            activeConsumers: 18,
            monthlyRequests: 1250000,
        },
        compliance: {
            hasDocumentation: true,
            hasTests: true,
            hasMonitoring: true,
            securityScore: 90,
        },
        apis: ['api-user-v2'],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-12-15T14:30:00Z',
    },
    {
        id: 'prod-payment',
        name: 'Payment API',
        displayName: 'Payment Processing API',
        description: 'Secure payment processing and billing',
        version: '1.5.2',
        ownerTeamId: 'team-analytics',
        ownerAdGroupId: 'ad-group-analytics',
        environment: 'qa',
        qualityScore: 92,
        adoptionMetrics: {
            totalSubscribers: 12,
            activeConsumers: 10,
            monthlyRequests: 450000,
        },
        compliance: {
            hasDocumentation: true,
            hasTests: true,
            hasMonitoring: true,
            securityScore: 95,
        },
        apis: ['api-payment-v1'],
        createdAt: '2024-03-20T08:00:00Z',
        updatedAt: '2024-12-28T16:45:00Z',
    },
];

/**
 * Mock orphan product (no valid owner team)
 */
export const mockOrphanProduct: Product = {
    id: 'prod-legacy',
    name: 'Legacy API',
    displayName: 'Legacy System API',
    description: 'Deprecated legacy system integration',
    version: '0.9.0',
    ownerTeamId: 'legacy-pool',
    ownerAdGroupId: 'ad-group-legacy',
    environment: 'dev',
    qualityScore: 45,
    adoptionMetrics: {
        totalSubscribers: 3,
        activeConsumers: 2,
        monthlyRequests: 15000,
    },
    compliance: {
        hasDocumentation: false,
        hasTests: false,
        hasMonitoring: false,
        securityScore: 60,
    },
    apis: ['api-legacy-v0'],
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-06-15T10:00:00Z',
};

/**
 * Mock APIsexport const mockAPIs: API[] = [
  {
    id: 'api-user-v2',
    name: 'User API v2',
    productId: 'prod-user-api',
    version: '2.0',
    endpoints: 12,
    operations: [
      {
        id: 'op-get-user',
        name: 'Get User',
        method: 'GET',
        path: '/users/{userId}',
        description: 'Retrieve user by ID',
      },
      {
        id: 'op-create-user',
        name: 'Create User',
        method: 'POST',
        path: '/users',
        description: 'Create new user',
      },
    ],
  },
];

/**
 * Mock Subscriptions
 */
export const mockSubscriptions: Subscription[] = [
    {
        id: 'sub-mobile-user-api',
        productId: 'prod-user-api',
        teamId: 'team-mobile',
        environment: 'prod',
        status: 'active',
        createdAt: '2024-06-01T00:00:00Z',
        expiresAt: '2025-06-01T00:00:00Z',
    },
];

/**
 * Mock Approval Requests
 */
export const mockApprovalRequests: ApprovalRequest[] = [
    {
        id: 'approval-prod-payment-qa-to-prod',
        productId: 'prod-payment',
        requestedBy: 'user@example.com',
        fromEnvironment: 'qa',
        toEnvironment: 'prod',
        status: 'PENDING',
        createdAt: '2024-12-29T10:00:00Z',
        approvalType: 'product_promotion',
    },
];

/**
 * Factory functions for creating custom mocks
 */

export function createMockTeam(overrides: Partial<Team> = {}): Team {
    return {
        id: 'team-test',
        name: 'Test Team',
        azureAdGroupId: 'ad-group-test',
        type: 'both',
        description: 'Test team for unit tests',
        memberCount: 5,
        ...overrides,
    };
}

export function createMockProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: 'prod-test',
        name: 'Test Product',
        displayName: 'Test Product',
        description: 'Test product for unit tests',
        version: '1.0.0',
        ownerTeamId: 'team-test',
        ownerAdGroupId: 'ad-group-test',
        environment: 'dev',
        qualityScore: 75,
        adoptionMetrics: {
            totalSubscribers: 5,
            activeConsumers: 3,
            monthlyRequests: 10000,
        },
        compliance: {
            hasDocumentation: true,
            hasTests: true,
            hasMonitoring: true,
            securityScore: 80,
        },
        apis: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

export function createMockSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
        id: 'sub-test',
        productId: 'prod-test',
        teamId: 'team-test',
        environment: 'dev',
        status: 'active',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}
