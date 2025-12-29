/**
 * Consumer Specific Types
 * 
 * Decentralized from global entities.ts
 */

export interface SubscriptionKey {
    name: string;
    value: string;
}

export interface AppRegistration {
    id: string;
    displayName: string;
    clientId: string;
    environment: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    ownerTeamId: string;
    productId?: string;
    appIdUri?: string;
    secretExpiryDate?: string;
    createdAt?: string;
}

export interface Subscription {
    id: string;
    productId: string;
    subscriberTeamId: string;
    state: 'active' | 'suspended' | 'submitted' | 'pending' | 'rejected' | 'cancelled' | 'expired';
    primaryKey: SubscriptionKey;
    secondaryKey: SubscriptionKey;
    createdAt: string;
    updatedAt?: string;
    expirationDate?: string;
    keysGeneratedAt?: string;
    lastSyncedAt?: string;
    appRegistrationId?: string;
    appRegistration?: AppRegistration;
}
