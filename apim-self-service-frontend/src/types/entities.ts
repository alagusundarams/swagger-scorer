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
    additionalAdGroups?: string[]; // Secondary AD Groups (e.g. Legacy identities)
    adGroupMapping?: {
        DEV?: string; // AD Group ID for Dev access
        QA?: string;
        STAGE?: string;
        PROD?: string;
    };
}

export interface User {
    id: string;
    email: string;
    name: string;
    azureAdObjectId: string;
    teams: string[]; // Team IDs
    leadsTeams: string[]; // Team IDs where user is a Lead/Architect
    defaultTeamId: string;
    role: 'user' | 'admin';
    username?: string; // Compatibility for MSAL
    adGroups?: string[]; // Groups the user belongs to (Mock for RBAC)
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
    originTeamId?: string; // For GRP: Original owner of the API
}

export interface Product {
    id: string;
    name: string;
    displayName: string;
    type?: 'standard' | 'grp'; // Default to 'standard' if undefined
    version: string;
    description: string;
    state: 'published' | 'notPublished' | 'draft';
    ownerTeamId: string;
    ownerAdGroupId?: string; // Specific AD Group that owns this (if team has multiple)
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
    environment?: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    visibility?: 'public' | 'internal' | 'private' | 'owner-only';
    authorizedTeams?: string[]; // DEPRECATED: Legacy, use authorizedTeamsByEnv
    authorizedTeamsByEnv?: Record<'DEV' | 'QA' | 'STAGE' | 'PROD', string[]>; // Environment-scoped authorization
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
    };

    // Migration support: Track product management mode
    management_mode?: 'TERRAFORM_MANAGED' | 'HYBRID' | 'PORTAL_MANAGED';
    terraform_pipeline_url?: string; // Link to Azure DevOps pipeline for Terraform products
    git_repo_url?: string; // Main Repo URL

    // Git Sync
    lastDeployedCommitHash?: string;
    lastDeployedAt?: string;

    // Governance
    detectedAnomalies?: string[];
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
    keysGeneratedAt?: string;
    lastSyncedAt?: string;
    appRegistration?: {
        id: string;
        displayName: string;
        clientId: string;
        environment: string;
        secretExpiryDate?: string;
    };
}

export interface ConfigurationItem {
    key: string;
    values: Record<string, string>;
    isSecret: boolean;
    scope: 'API' | 'Global' | 'Product';
    context: string;
    lastEditedBy: string;
    lastEditedAt: string;
    certificate?: {
        thumbprint: string;
        expiryDate: string;
        subject: string;
    };
}
