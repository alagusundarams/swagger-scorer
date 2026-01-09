/**
 * Shared Type Definitions
 * 
 * Domain models that are used across multiple features.
 * Any type defined here constitutes a "Public Shared Contract" between features.
 */

import { type Environment } from '../../core/types/commonTypes';
export { type Environment };

// --- Team Domain ---
export interface Team {
    id: string;
    name: string;
    azureAdGroupId: string;
    type: 'producer' | 'consumer' | 'both';
    description: string;
    memberCount: number;
    additionalAdGroups?: string[];
    adGroupMapping?: {
        DEV?: string;
        QA?: string;
        STAGE?: string;
        PROD?: string;
    };
}

// --- Inventory Domain ---
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
    originTeamId?: string;
    gitRepoUrl?: string;
    gitFilePath?: string;
    computedStatus?: string;
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
        type: 'PRODUCT' | 'API';
    };
    gitInfo?: {
        managedByTfvars?: boolean;
        contractPath?: string;
        policyPath?: string;
        repoUrl?: string;
        lastCommit?: string;
        lastCommitDate?: string;
        definitionUrl?: string;
        contractUrl?: string;
        policyUrl?: string;
    };
}

export interface NamedValue {
    id: string;
    displayName: string;
    systemName: string;
    value: string;
    type: 'literal' | 'key_vault';
    isSecret: boolean;
    environment?: string;
    region?: string;
    scopeId?: string;
    scopeName?: string;
    createdAt?: string;
}

export interface Product {
    id: string;
    name: string;
    displayName: string;
    type?: 'standard' | 'grp';
    version: string;
    description: string;
    state: 'published' | 'notPublished';
    ownerTeamId: string;
    ownerAdGroupId?: string;
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
    environment?: Environment;
    visibility?: 'public' | 'internal' | 'private' | 'owner-only';
    authorizedTeams?: string[];
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
        type: 'PRODUCT' | 'API';
    };
    managementMode?: 'TERRAFORM_MANAGED' | 'HYBRID' | 'UNTRACKED';
    terraformPipelineUrl?: string;
    gitRepoUrl?: string;
    gitFilePath?: string;
    lastDeployedCommitHash?: string;
    lastDeployedAt?: string;
    gitInfo?: {
        repoUrl: string;
        lastCommit: string;
        lastCommitDate: string;
        productPolicyPath?: string;
        productPolicyFile?: string;
        managedByTfvars?: boolean;
        definitionUrl?: string;
        policyUrl?: string;
        productDependencies?: string[];
        apiDependencies?: Record<string, string[]>;
    };
    detectedAnomalies?: string[];
    reconciliationStatus?: 'GHOST' | 'RECONCILED' | 'MANUAL';
    region?: string;
    ownerTeamName?: string;
    namedValues?: NamedValue[];
    accessLevel?: 'NONE' | 'READ' | 'WRITE';
    isDeployed?: boolean;
    envHashes?: {
        DEV?: string;
        QA?: string;
        STAGE?: string;
        PROD?: string;
    };
    deployments?: Deployment[];
}

export interface Deployment {
    environment: string;
    commitHash: string;
    deploymentDate: string;
    branch: string;
    author: string;
    message: string;
    deploymentUrl: string;
}

// --- Consumer Domain ---
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
    teamName?: string;
}

// --- Governance Domain ---
export type ApprovalType =
    | 'PRODUCT_ONBOARDING'
    | 'API_ONBOARDING'
    | 'MODIFICATION'
    | 'SUBSCRIPTION'
    | 'PROMOTION_REQUEST'
    | 'ACCESS_REQUEST'
    | 'ACCESS'
    | 'PROMOTION'
    | 'QUOTA_EXTENSION'
    | 'DEPRECATION_REQUEST';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    state?: string;
    requester: {
        name: string;
        email: string;
        teamId: string;
        teamName: string;
    };
    approverTeamId: string;
    submittedAt: string;
    createdAt?: string;
    productId?: string;
    details: {
        targetName: string;
        targetVersion?: string;
        targetId?: string;
        environment?: string;
        promotionPath?: { source: string; target: string };
        modificationType?: string;
        diffSummary?: string;
        requestedQuota?: string;
        reason?: string;
    };
    justification?: string;
    answeredBy?: string;
}

export interface AuditLog {
    id: string | number;
    action: string;
    entityType?: string;
    entityId?: string;
    targetId?: string;
    targetType?: string;
    performedBy?: string;
    userId?: string;
    timestamp: string;
    details?: string;
    changes?: any;
}
