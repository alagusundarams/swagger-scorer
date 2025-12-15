// Mock subscriptions
export interface SubscriptionKey {
    name: string;
    value: string;
}

export interface Subscription {
    id: string;
    productId: string;
    subscriberTeamId: string;
    state: 'active' | 'suspended' | 'pending' | 'rejected' | 'cancelled' | 'expired';
    primaryKey: SubscriptionKey;
    secondaryKey: SubscriptionKey;
    createdAt: string;
    updatedAt?: string;
    expirationDate?: string;
}

export const mockSubscriptions: Subscription[] = [
    // Platform Team subscriptions
    {
        id: 'sub-platform-payment',
        productId: 'product-payment-gateway',
        subscriberTeamId: 'team-platform',
        state: 'active',
        primaryKey: {
            name: 'prod-payment-key',
            value: 'pk_live_51abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
        },
        secondaryKey: {
            name: 'prod-payment-key-secondary',
            value: 'pk_live_51xyz987wvu654tsr321qpo098nml765kji432hgf210edc109ba'
        },
        createdAt: '2024-01-15T10:30:00Z',
        expirationDate: '2024-12-31T23:59:59Z'
    },
    {
        id: 'sub-platform-email',
        productId: 'product-email-service',
        subscriberTeamId: 'team-platform',
        state: 'active',
        primaryKey: {
            name: 'email-api-key',
            value: 'em_api_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
        },
        secondaryKey: {
            name: 'email-api-key-backup',
            value: 'em_api_xyz987wvu654tsr321qpo098nml765kji432hgf210edc109ba'
        },
        createdAt: '2024-02-01T14:00:00Z'
    },
    // Payments Team subscriptions
    {
        id: 'sub-payments-gateway',
        productId: 'product-payment-gateway',
        subscriberTeamId: 'team-payments',
        state: 'active',
        primaryKey: {
            name: 'payments-team-key',
            value: 'pk_live_51pay123men456ts7team89key012abc345def678ghi901jkl234'
        },
        secondaryKey: {
            name: 'payments-team-key-secondary',
            value: 'pk_live_51pay987sec654ond321key098bac765fed432ihg210lkj109'
        },
        createdAt: '2024-01-20T09:15:00Z',
        expirationDate: '2025-01-20T23:59:59Z'
    },
    {
        id: 'sub-payments-analytics',
        productId: 'product-analytics-api',
        subscriberTeamId: 'team-payments',
        state: 'active',
        primaryKey: {
            name: 'analytics-access-key',
            value: 'ana_key_123abc456def789ghi012jkl345mno678pqr901stu234vwx567'
        },
        secondaryKey: {
            name: 'analytics-access-key-backup',
            value: 'ana_key_987zyx654wvu321tsr098qpo765nml432kji109hgf876edc543'
        },
        createdAt: '2024-02-10T11:30:00Z'
    },
    // Data Team subscriptions
    {
        id: 'sub-data-user-service',
        productId: 'product-user-service',
        subscriberTeamId: 'team-data',
        state: 'active',
        primaryKey: {
            name: 'data-team-user-api',
            value: 'usr_api_dat123tea456m78key90abc12def34ghi56jkl78mno90pqr12'
        },
        secondaryKey: {
            name: 'data-team-user-api-backup',
            value: 'usr_api_dat987bac654kup321key09zyx87wvu65tsr43qpo21nml09'
        },
        createdAt: '2024-03-01T08:45:00Z',
        updatedAt: '2024-03-01T08:45:00Z'
    },
    {
        id: 'sub-pending-demo',
        productId: 'product-user-service',
        subscriberTeamId: 'team-external-1',
        state: 'pending',
        primaryKey: {
            name: 'pending-key-request',
            value: 'PENDING-KEY-REQ'
        },
        secondaryKey: {
            name: 'pending-key-request-sec',
            value: 'PENDING-KEY-REQ-SEC'
        },
        createdAt: '2024-03-22T12:00:00Z',
        updatedAt: '2024-03-22T12:00:00Z'
    }
];
