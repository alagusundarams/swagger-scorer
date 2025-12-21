/**
 * @fileoverview Workflow Entity Types
 * 
 * Types related to approvals, audit logs, and lifecycle events.
 */

import { type Environment } from './entities';

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
    productId?: string; // Optional context linking to a product
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

export interface AuditLog {
    id: number;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    changes: any;
    timestamp: string;
}
