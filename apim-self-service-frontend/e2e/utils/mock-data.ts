
export const MOCK_PRODUCTS = [
    {
        id: 'prod-001',
        name: 'payment-gateway',
        displayName: 'Payment Gateway',
        version: 'v1.0.0',
        description: 'Core payment processing API',
        ownerTeamId: 'team-payments',
        ownerTeamName: 'Platform Engineering',
        visibility: 'public',
        managementMode: 'PORTAL_MANAGED',
        environment: 'DEV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        apis: [{ id: 'api-001', name: 'payments-v1', displayName: 'Payments API' }],
        subscriberCount: 5,
        qualityScore: 95
    },
    {
        id: 'prod-002',
        name: 'identity-service',
        displayName: 'Identity Service',
        version: 'v2.1.0',
        description: 'User authentication',
        ownerTeamId: 'team-payments',
        ownerTeamName: 'Platform Engineering',
        managementMode: 'PORTAL_MANAGED',
        visibility: 'public',
        environment: 'PROD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        apis: [{ id: 'api-002', name: 'identity-v1', displayName: 'Identity API' }],
        subscriberCount: 12,
        qualityScore: 88
    },
    {
        id: 'prod-orphan-001',
        name: 'legacy-api',
        displayName: 'Legacy API',
        version: 'v0.9.5',
        ownerTeamId: 'legacy-pool',
        updatedAt: new Date().toISOString(),
        apis: [],
        subscriberCount: 0,
        qualityScore: 45
    },
    {
        id: 'prod-orphan-002',
        name: 'ghost-service',
        displayName: 'Ghost Service',
        version: 'v1.0.0',
        ownerTeamId: '',
        updatedAt: new Date().toISOString(),
        apis: [],
        subscriberCount: 0,
        qualityScore: 10
    },
    {
        id: 'prod-orphan-003',
        name: 'zombie-api',
        displayName: 'Zombie API',
        version: 'v2.0.0',
        ownerTeamId: 'orphan',
        updatedAt: new Date().toISOString(),
        apis: [],
        subscriberCount: 0,
        qualityScore: 20
    },
    {
        id: 'prod-orphan-004',
        name: 'abandoned-tool',
        displayName: 'Abandoned Tool',
        version: 'v1.1.0',
        ownerTeamId: 'none',
        updatedAt: new Date().toISOString(),
        apis: [],
        subscriberCount: 0,
        qualityScore: 5
    }
];

export const MOCK_TEAMS = [
    { id: 'team-payments', name: 'Platform Engineering', azureAdGroupId: 'group-payments' },
    { id: 'team-mobile', name: 'Mobile App Team', azureAdGroupId: 'group-mobile' },
    { id: 't1', name: 'FinTech Core', azureAdGroupId: 'group-fintech' },
    { id: 't2', name: 'Identity & Access', azureAdGroupId: 'group-iam' }
];

export const MOCK_SUBSCRIPTIONS = [
    {
        id: 'sub-001',
        productId: 'prod-002',
        productName: 'Identity Service',
        subscriberTeamId: 'team-payments',
        subscriberTeamName: 'Platform Engineering',
        state: 'active',
        primaryKey: { name: 'primary', value: 'sk_test_1' },
        environment: 'PROD'
    },
    {
        id: 'sub-Mike',
        productId: 'prod-002',
        productName: 'Identity Service',
        subscriberTeamId: 'team-mobile',
        subscriberTeamName: 'Mobile App Team',
        state: 'active',
        primaryKey: { name: 'primary', value: 'sk_test_mike_123' },
        secondaryKey: { name: 'secondary', value: 'sk_test_mike_456' },
        environment: 'PROD'
    },
    {
        id: 'sub-002',
        productId: 'prod-001',
        productName: 'Payment Gateway',
        subscriberTeamId: 'team-mobile',
        subscriberTeamName: 'Mobile App Team',
        state: 'active',
        primaryKey: { name: 'primary', value: 'sk_test_2' },
        environment: 'DEV'
    },
    {
        id: 'sub-003',
        productId: 'prod-001',
        productName: 'Payment Gateway',
        subscriberTeamId: 't2',
        subscriberTeamName: 'Identity & Access',
        state: 'active',
        primaryKey: { name: 'primary', value: 'sk_test_3' },
        environment: 'PROD'
    }
];

export const MOCK_APIS = [{ id: 'api-001', name: 'payments-v1', displayName: 'Payments API', productId: 'prod-001' }];
export const MOCK_APPROVALS = [];
export const MOCK_ENVIRONMENTS = ['DEV', 'QA', 'PROD'];
