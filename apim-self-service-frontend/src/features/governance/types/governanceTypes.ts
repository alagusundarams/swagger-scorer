/**
 * Governance Specific Types (Approvals & Audit Logs)
 * 
 * Decentralized from global workflow.ts and entities.ts
 */

export type ApprovalType =
    | 'PRODUCT_ONBOARDING'
    | 'API_ONBOARDING'
    | 'MODIFICATION'
    | 'SUBSCRIPTION'
    | 'PROMOTION_REQUEST'
    | 'ACCESS_REQUEST'
    | 'ACCESS' // Compatibility
    | 'PROMOTION' // Compatibility
    | 'QUOTA_EXTENSION'
    | 'DEPRECATION_REQUEST';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    state?: string; // Compatibility with backend 'state' field if needed
    requester: {
        name: string;
        email: string;
        teamId: string;
        teamName: string;
    };
    approverTeamId: string;
    submittedAt: string;
    createdAt?: string; // Compatibility
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
