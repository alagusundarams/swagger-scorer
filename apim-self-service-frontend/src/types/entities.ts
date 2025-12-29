/**
 * @fileoverview Core Entity Types
 * 
 * Centralized TypeScript interfaces for business entities.
 * These types are shared across the application and align with the backend API.
 */

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
    gitRepoUrl?: string;   // Link to source code
    gitFilePath?: string;  // Precise path to contract in Git
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

export interface Product {
    id: string;
    name: string;
    displayName: string;
    type?: 'standard' | 'grp'; // Default to 'standard' if undefined
    version: string;
    description: string;
    state: 'published' | 'notPublished';
    ownerTeamId: string;
    ownerAdGroupId?: string; // Specific AD Group that owns this (if team has multiple)
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
    environment?: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    visibility?: 'public' | 'internal' | 'private' | 'owner-only';
    authorizedTeams?: string[]; // Teams authorized to view/subscribe to this product
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
    };

    // Migration support: Track product management mode
    managementMode?: 'TERRAFORM_MANAGED' | 'HYBRID' | 'PORTAL_MANAGED';
    terraformPipelineUrl?: string; // Link to Azure DevOps pipeline for Terraform products
    gitRepoUrl?: string; // Main Repo URL
    gitFilePath?: string; // Path to product policy

    // Git Sync
    lastDeployedCommitHash?: string;
    lastDeployedAt?: string;

    // Infrastructure metadata
    gitInfo?: {
        repoUrl: string;
        lastCommit: string;
        lastCommitDate: string;
        productPolicyPath?: string;
        productPolicyFile?: string;
        managedByTfvars?: boolean;
        definitionUrl?: string; // Deep-link to .tfvars
        policyUrl?: string; // Deep-link to policy XML
        productDependencies?: string[];
        apiDependencies?: Record<string, string[]>;
    };

    // Governance
    detectedAnomalies?: string[];
    reconciliationStatus?: 'GHOST' | 'RECONCILED' | 'MANUAL';

    // Config
    region?: string;
    ownerTeamName?: string;
    namedValues?: NamedValue[];
}

export interface NamedValue {
    id: string;
    displayName: string;
    systemName: string;
    value: string; // Masked if secret
    type: 'literal' | 'key_vault';
    isSecret: boolean;
    scopeId?: string; // If present, scoped to specific API ID
    scopeName?: string; // Resolved display name of scope
    createdAt?: string;
}

export type Environment = 'ALL' | 'DEV' | 'QA' | 'STAGE' | 'PROD';

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

export interface GlobalDeployment {
    id: string;
    environment: string;
    state: string;
    gitRepoUrl: string;
    managementMode: string;
    qualityScore: number;
    reconciliationStatus: 'GHOST' | 'RECONCILED' | 'MANUAL';
}

export interface GlobalProduct {
    name: string;
    displayName: string;
    type: string;
    ownerTeamId: string;
    ownerTeamName: string;
    deployments: GlobalDeployment[];
}

export interface GlobalAPI {
    name: string;
    displayName: string;
    path: string;
    deployments: {
        id: string;
        productId: string;
        environment: string;
        qualityScore: number;
        originTeamId: string;
    }[];
}

export interface GlobalInventoryResponse {
    products: GlobalProduct[];
    apis: GlobalAPI[];
}
