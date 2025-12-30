/**
 * Mock Data for Tests - FIXED
 */

import type { Team, Product, Subscription, ApprovalRequest, Environment } from '../shared/types/domain';

// Mock Teams
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

// Mock Environments
export const mockEnvironments: Environment[] = ['DEV', 'QA', 'PROD'];

// Mock Products
export const mockProducts: Product[] = [
    {
        id: 'prod-user-api',
        name: 'User API',
        displayName: 'User Management API',
        description: 'Core user management and authentication API',
        version: '2.1.0',
        ownerTeamId: 'team-platform',
        ownerAdGroupId: 'ad-group-platform',
        environment: 'PROD',
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
        apis: [],
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
        environment: 'QA',
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
        apis: [],
        createdAt: '2024-03-20T08:00:00Z',
        updatedAt: '2024-12-28T16:45:00Z',
    },
];

// Mock Subscriptions  
export const mockSubscriptions: Subscription[] = [
    {
        id: 'sub-mobile-user-api',
        productId: 'prod-user-api',
        environment: 'PROD',
        status: 'active',
        createdAt: '2024-06-01T00:00:00Z',
        expiresAt: '2025-06-01T00:00:00Z',
    },
];

// Mock Approval Requests
export const mockApprovalRequests: ApprovalRequest[] = [];

// Factory functions
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
        environment: 'DEV',
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
        environment: 'DEV',
        status: 'active',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}
