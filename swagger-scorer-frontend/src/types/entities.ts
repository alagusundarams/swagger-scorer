/**
 * @fileoverview Core Entity Types
 * 
 * Centralized TypeScript interfaces for business entities.
 * These types are shared across the application and align with the backend API.
 */

export interface Team {
    id: string;
    name: string;
    azureAdGroupId: string;
    type: 'producer' | 'consumer' | 'both';
    description: string;
    memberCount: number;
}

export interface User {
    id: string;
    email: string;
    name: string;
    azureAdObjectId: string;
    teams: string[]; // Team IDs
    defaultTeamId: string;
    role: 'user' | 'admin';
    username?: string; // Compatibility for MSAL
}

export interface Operation {
    id: string;
    name: string;
    displayName: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    urlTemplate: string;
    description: string;
}

export interface API {
    id: string;
    name: string;
    displayName: string;
    description: string;
    path: string;
    operations: Operation[];
    qualityScore?: number;
}

export interface Product {
    id: string;
    name: string;
    displayName: string;
    version: string;
    description: string;
    state: 'published' | 'notPublished';
    ownerTeamId: string;
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
    environment?: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    visibility?: 'public' | 'private' | 'owner-only';
    authorizedTeams?: string[]; // IDs of teams with access
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
    };
}

export type Environment = 'ALL' | 'DEV' | 'QA' | 'STAGE' | 'PROD';

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

export type ApprovalType =
    | 'PRODUCT_ONBOARDING'
    | 'API_ONBOARDING'
    | 'MODIFICATION'
    | 'SUBSCRIPTION'
    | 'PROMOTION_REQUEST'
    | 'QUOTA_EXTENSION'
    | 'DEPRECATION_REQUEST';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ModificationType = 'CONTRACT_UPDATE' | 'HOTFIX' | 'VERSION_BUMP';

export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    requester: {
        name: string;
        email: string;
        teamId: string;
        teamName: string;
    };
    submittedAt: string;
    details: {
        targetName: string; // Product or API name
        targetVersion?: string;
        targetId?: string;

        // Context specific
        environment?: Environment; // Target Env
        promotionPath?: { source: Environment; target: Environment };

        modificationType?: ModificationType;
        diffSummary?: string;

        requestedQuota?: string; // For Quota Extension
        reason?: string;
    };
}

