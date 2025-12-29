
export const MOCK_PRODUCTS = [
    {
        id: 'prod-001',
        name: 'payment-gateway',
        displayName: 'Payment Gateway',
        version: 'v1.0.0',
        description: 'Core payment processing API',
        ownerTeamId: 't1',
        visibility: 'public',
        managementMode: 'PORTAL_MANAGED',
        gitRepoUrl: 'https://dev.azure.com/ionosphere/core/_git/portal',
        environment: 'DEV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        apis: [{
            id: 'api-001',
            name: 'payments-v1',
            displayName: 'Payments API',
            version: 'v1.0.0',
            productId: 'prod-001',
            path: '/payments/v1',
            operations: [
                { id: 'op-1', method: 'GET', urlTemplate: '/charges', displayName: 'Get Charges', description: 'List all charges' },
                { id: 'op-2', method: 'POST', urlTemplate: '/voids', displayName: 'Void Charge', description: 'Void a payment' }
            ],
            qualityScore: 92
        }],
        subscriberCount: 5,
        qualityScore: 95
    },
    {
        id: 'prod-002',
        name: 'identity-service',
        displayName: 'Identity Service',
        version: 'v2.1.0',
        description: 'User authentication and profile management',
        ownerTeamId: 't2',
        visibility: 'internal',
        state: 'published',
        environment: 'PROD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        apis: [{
            id: 'api-002',
            name: 'auth-api',
            displayName: 'Auth API',
            version: 'v2.1.0',
            productId: 'prod-002',
            path: '/auth',
            operations: [],
            qualityScore: 85
        }],
        subscriberCount: 12,
        qualityScore: 88
    }
];

export const MOCK_APIS = [
    {
        id: 'api-001',
        name: 'payments-v1',
        displayName: 'Payments API',
        version: 'v1.0.0',
        productId: 'prod-001',
        path: '/payments/v1',
        operations: []
    }
];

export const MOCK_TEAMS = [
    {
        id: 't1',
        name: 'FinTech Core',
        azureAdGroupId: 'group-fintech',
        type: 'internal',
        description: 'Core financial services team',
        memberCount: 12
    },
    {
        id: 't2',
        name: 'Identity & Access',
        azureAdGroupId: 'group-iam',
        type: 'internal',
        description: 'Security and identity team',
        memberCount: 8
    }
];

export const MOCK_SUBSCRIPTIONS = [
    {
        id: 'sub-001',
        productId: 'prod-002',
        productName: 'Identity Service',
        subscriberTeamId: 't1',
        state: 'active',
        primaryKey: { name: 'primary', value: 'sk_test_123456789' },
        secondaryKey: { name: 'secondary', value: 'sk_test_987654321' },
        environment: 'PROD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export const MOCK_APPROVALS = [
    {
        id: 'app-001',
        type: 'PROMOTION_REQUEST',
        status: 'PENDING',
        requester: { name: 'John Doe', email: 'user@company.com', teamId: 't1', teamName: 'FinTech Core' },
        approverTeamId: 't1',
        submittedAt: new Date().toISOString(),
        details: {
            targetName: 'Payment Gateway',
            targetId: 'prod-001',
            environment: 'PROD',
            reason: 'Ready for market release'
        }
    }
];
