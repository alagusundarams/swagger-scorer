/**
 * Inventory Specific Types
 * 
 * Decentralized from global entities.ts
 */

import { type Environment } from '../../../types/entities';

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
    type?: 'standard' | 'grp';
    version: string;
    description: string;
    state: 'published' | 'notPublished';
    environment?: Environment; // Changed type and made required -> Now optional to match entities
    region?: string; // Added region field
    ownerTeamId: string;
    ownerAdGroupId?: string;
    ownerTeamName?: string; // Added ownerTeamName field
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
    visibility?: 'public' | 'internal' | 'private' | 'owner-only';
    authorizedTeams?: string[];
    identity?: {
        clientId: string;
        displayName: string;
        appIdUri: string;
    };
    managementMode?: 'TERRAFORM_MANAGED' | 'HYBRID' | 'PORTAL_MANAGED';
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
