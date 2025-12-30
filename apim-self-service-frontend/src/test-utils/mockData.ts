/**
 * Mock Data for Tests - Matching Real Interfaces
 */

import type { Team, Product, Subscription, Environment } from '../shared/types/domain';

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
];

// Mock Environments
export const mockEnvironments: Environment[] = ['DEV', 'QA', 'PROD'];

// Mock Products (matching actual Product interface)
export const mockProducts: Product[] = [
    {
        id: 'prod-user-api',
        name: 'User API',
        displayName: 'User Management API',
        description: 'Core user management and authentication API',
        version: '2.1.0',
        state: 'published',
        ownerTeamId: 'team-platform',
        ownerAdGroupId: 'ad-group-platform',
        environment: 'PROD',
        qualityScore: 85,
        subscriberCount: 24,
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
        state: 'published',
        ownerTeamId: 'team-mobile',
        ownerAdGroupId: 'ad-group-mobile',
        environment: 'QA',
        qualityScore: 92,
        apis: [],
        createdAt: '2024-03-20T08:00:00Z',
        updatedAt: '2024-12-28T16:45:00Z',
    },
];

// Mock Subscriptions (matching actual Subscription interface)
export const mockSubscriptions: Subscription[] = [
    {
        id: 'sub-mobile-user-api',
        productId: 'prod-user-api',
        displayName: 'Mobile Team User API Access',
        state: 'active',
        scope: 'subscription',
        primaryKey: 'primary-key-123',
        secondaryKey: 'secondary-key-456',
        createdDate: '2024-06-01T00:00:00Z',
        callCount: 125000,
        dataTransferred: 5242880,
        apiQuotaResetDate: new Date().toISOString(),
    },
];

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
        state: 'published',
        ownerTeamId: 'team-test',
        ownerAdGroupId: 'ad-group-test',
        environment: 'DEV',
        qualityScore: 75,
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
        displayName: 'Test Subscription',
        state: 'active',
        scope: 'subscription',
        primaryKey: 'test-key-123',
        secondaryKey: 'test-key-456',
        createdDate: new Date().toISOString(),
        ...overrides,
    };
}
