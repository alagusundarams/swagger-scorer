
import { StateCreator } from 'zustand';
import { PolicyTemplate } from '../components/policyTemplates';
import { getPolicyTemplates } from '../api/policyClient';

export interface PolicySlice {
    policyTemplates: PolicyTemplate[];
    isLoadingTemplates: boolean;
    error: string | null;
    fetchPolicyTemplates: () => Promise<void>;
}

export const createPolicySlice: StateCreator<PolicySlice> = (set) => ({
    policyTemplates: [],
    isLoadingTemplates: false,
    error: null,
    fetchPolicyTemplates: async () => {
        set({ isLoadingTemplates: true, error: null });
        try {
            const templates = await getPolicyTemplates();
            set({ policyTemplates: templates, isLoadingTemplates: false });
        } catch (err: any) {
            set({ error: err.message, isLoadingTemplates: false });
        }
    }
});
