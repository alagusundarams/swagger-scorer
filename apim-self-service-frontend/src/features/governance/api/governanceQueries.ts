/**
 * Governance Query Hooks
 * 
 * TanStack Query wrappers for governance-related API calls.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getApprovals,
    updateApproval,
    getAuditLogs,
    requestPromotion
} from './governanceClient';

// Query Keys
export const governanceKeys = {
    approvals: ['governance', 'approvals'] as const,
    auditLogs: (entityId?: string) => ['governance', 'audit-logs', entityId] as const,
};

/**
 * Hook to fetch Approval Requests
 */
export function useApprovalsQuery() {
    return useQuery({
        queryKey: governanceKeys.approvals,
        queryFn: getApprovals,
    });
}

/**
 * Hook to fetch Audit Logs
 */
export function useAuditLogsQuery(entityId?: string) {
    return useQuery({
        queryKey: governanceKeys.auditLogs(entityId),
        queryFn: () => getAuditLogs(entityId),
    });
}

/**
 * Mutations
 */
export function useUpdateApprovalMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ approvalId, decision }: { approvalId: string; decision: { state: string; reason: string } }) =>
            updateApproval(approvalId, decision),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: governanceKeys.approvals });
        }
    });
}

export function useRequestPromotionMutation() {
    return useMutation({
        mutationFn: ({ productId, targetEnv }: { productId: string; targetEnv: string }) =>
            requestPromotion(productId, targetEnv),
    });
}
