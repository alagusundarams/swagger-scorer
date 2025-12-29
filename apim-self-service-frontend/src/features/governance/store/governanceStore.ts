import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApprovalRequest, AuditLog } from '../types/governanceTypes';
import { governanceApi } from '../api/governanceClient';

interface GovernanceState {
    approvalRequests: ApprovalRequest[];
    auditLogs: AuditLog[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchApprovals: () => Promise<void>;
    fetchAuditLogs: (entityId?: string) => Promise<void>;
    processApproval: (id: string, decision: 'APPROVE' | 'REJECT', justification?: string) => Promise<void>;
    requestProductPromotion: (productId: string, targetEnv: string) => Promise<void>;
}

/**
 * Governance Store - FEATURE DOMAIN
 * 
 * Manages approval workflows and audit trails.
 */
export const useGovernanceStore = create<GovernanceState>()(
    persist(
        (set) => ({
            approvalRequests: [],
            auditLogs: [],
            isLoading: false,
            error: null,

            fetchApprovals: async () => {
                set({ isLoading: true, error: null });
                try {
                    const approvals = await governanceApi.getApprovals();
                    set({ approvalRequests: approvals, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            fetchAuditLogs: async (entityId) => {
                set({ isLoading: true, error: null });
                try {
                    const logs = await governanceApi.getAuditLogs(entityId);
                    set({ auditLogs: logs, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            processApproval: async (id, decision, justification) => {
                const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
                try {
                    await governanceApi.updateApproval(id, { state: newStatus.toLowerCase(), reason: justification || '' });
                    set((state) => ({
                        approvalRequests: state.approvalRequests.map(r => r.id === id ? { ...r, status: newStatus as any } : r)
                    }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            requestProductPromotion: async (productId, targetEnv) => {
                set({ isLoading: true });
                try {
                    const newRequest = await governanceApi.requestPromotion(productId, targetEnv);
                    set((state) => ({
                        approvalRequests: [newRequest, ...state.approvalRequests],
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            }
        }),
        { name: 'governance-storage' }
    )
);
