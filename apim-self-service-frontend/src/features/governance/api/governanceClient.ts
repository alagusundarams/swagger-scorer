import { api as baseClient } from '../../../api/baseClient';
import type { ApprovalRequest, AuditLog } from '../types/governanceTypes';

/**
 * Governance API Client
 * 
 * Decentralized from inventory module.
 */
export const getApprovals = async (): Promise<ApprovalRequest[]> => {
    const res = await baseClient.get('/approvals');
    return res.data;
};

export const updateApproval = async (approvalId: string, decision: { state: string, reason: string }): Promise<ApprovalRequest> => {
    const res = await baseClient.put(`/approvals/${approvalId}`, decision);
    return res.data;
};

export const getAuditLogs = async (entityId?: string): Promise<AuditLog[]> => {
    const res = await baseClient.get(`/audit-logs${entityId ? `?entityId=${entityId}` : ''}`);
    return res.data;
};

export const requestPromotion = async (productId: string, targetEnv: string): Promise<ApprovalRequest> => {
    const res = await baseClient.post(`/products/${productId}/promote`, { targetEnv });
    return res.data;
};

export const governanceApi = {
    getApprovals,
    updateApproval,
    getAuditLogs,
    requestPromotion
};
