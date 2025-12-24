import { StateCreator } from 'zustand';
import { type Product, type Subscription, type Team, type API, type AppRegistration } from '../../types/entities';
import { type ApprovalRequest, type AuditLog } from '../../types/workflow';
import { getProducts, getTeams, getSubscriptions, requestProductAccess, updateSubscription as apiUpdateSubscription, getApprovals, updateApproval, getAuditLogs, updateTeam as apiUpdateTeam, createTeam as apiCreateTeam, updateProduct as apiUpdateProduct, requestPromotion as apiRequestPromotion, getAppRegistrations, addAppRegistration as apiAddAppRegistration } from '../../features/inventory/api/inventoryClient';
import { AuthSlice } from './authSlice';

export interface DataSlice {
    products: Product[];
    subscriptions: Subscription[];
    teams: Team[];
    appRegistrations: AppRegistration[];
    approvalRequests: ApprovalRequest[];
    auditLogs: AuditLog[];

    fetchInitialData: (getToken?: () => Promise<string | null>) => Promise<void>;
    fetchAuditLogs: (entityId?: string) => Promise<void>;
    updateSubscription: (id: string, updates: Partial<Subscription>, getToken?: () => Promise<string | null>) => Promise<void>;
    addSubscription: (productId: string, teamId: string, getToken?: () => Promise<string | null>, appId?: string, justification?: string) => Promise<void>;
    processApproval: (id: string, decision: 'APPROVE' | 'REJECT', justification?: string, getToken?: () => Promise<string | null>) => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    updateAPI: (id: string, updates: Partial<API>) => Promise<void>;
    updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
    addTeam: (team: Team) => Promise<void>;
    requestProductPromotion: (productId: string, targetEnv: string, getToken?: () => Promise<string | null>) => Promise<void>;
    fetchAppRegistrations: (teamId?: string) => Promise<void>;
    addAppRegistration: (app: Partial<AppRegistration>) => Promise<void>;
    error: string | null;
    setError: (error: string | null) => void;
    isLoading: boolean;
}

export const createDataSlice: StateCreator<DataSlice & AuthSlice, [], [], DataSlice> = (set, get) => ({
    products: [],
    subscriptions: [],
    teams: [],
    appRegistrations: [],
    approvalRequests: [],
    auditLogs: [],
    error: null,
    isLoading: false,

    setError: (error) => set({ error }),

    fetchInitialData: async (getToken) => {
        set({ error: null, isLoading: true }); // Start loading
        try {
            const [productsRes, teamsRes, approvalsRes, auditRes] = await Promise.all([
                getProducts(),
                getTeams(),
                getApprovals(''),
                getAuditLogs()
            ]);

            const allTeams = teamsRes.data;

            set({
                products: productsRes.data,
                teams: allTeams,
                approvalRequests: approvalsRes.data,
                auditLogs: auditRes.data
            });

            // Mock notifications for testing (following notification strategy)
            const mockNotifications = [
                {
                    id: 'notif-0',
                    type: 'governance' as const,
                    title: 'Privacy Violation Prevented',
                    message: 'Automatic lockout triggered: Consumer Team "Alpha" attempted to access private product "Payments Core v2". Access successfully denied.',
                    timestamp: 'Just now',
                    read: false,
                    navigateTo: '/'
                },
                {
                    id: 'notif-1',
                    type: 'success' as const,
                    title: 'Subscription Approved',
                    message: 'Your request for Payment Gateway API was approved by Platform Team',
                    timestamp: '2 hours ago',
                    read: false,
                    navigateTo: '/'
                },
                {
                    id: 'notif-2',
                    type: 'warning' as const,
                    title: 'Access Expiring Soon',
                    message: 'Your Customer Service API access expires in 7 days',
                    timestamp: '1 day ago',
                    read: false,
                    navigateTo: '/'
                },
                {
                    id: 'notif-3',
                    type: 'info' as const,
                    title: 'API Deployed to Production',
                    message: 'Payment Gateway API v2.1 successfully deployed to PROD',
                    timestamp: '3 days ago',
                    read: true,
                    navigateTo: '/products/prod-payment'
                }
            ];

            // Note: We need to cast to any or use the UISlice specifically to set notifications
            (set as any)({ notifications: mockNotifications });

            // Map user teams (Group IDs) to Team Entity IDs
            const currentUser = get().user;
            if (currentUser) {
                const mappedTeamIds = currentUser.teams.map((groupIdOrId: string) => {
                    const team = allTeams.find((t: Team) => t.azureAdGroupId === groupIdOrId || t.id === groupIdOrId);
                    return team ? team.id : groupIdOrId;
                });
                set({ user: { ...currentUser, teams: mappedTeamIds } });
            }

            if (getToken) {
                const token = await getToken();
                if (token) {
                    const subsRes = await getSubscriptions(token);
                    set({ subscriptions: subsRes.data });
                }
            }
        } catch (error: any) {
            console.error("Failed to fetch initial data", error);
            set({ error: error.message || "Failed to load dashboard data. Please check your connection." });
        } finally {
            set({ isLoading: false });
        }
    },

    updateSubscription: async (id, updates, getToken) => {
        set((state) => ({
            subscriptions: state.subscriptions.map((s) => s.id === id ? { ...s, ...updates } : s)
        }));

        if (getToken && updates.state && (updates.state === 'active' || updates.state === 'rejected')) {
            try {
                const token = await getToken();
                if (token) {
                    await apiUpdateSubscription(id, updates.state, token);
                }
            } catch (error) {
                console.error("Failed to update subscription", error);
            }
        }
    },

    addSubscription: async (productId, teamId, getToken, appId, justification) => {
        if (!getToken) return;
        try {
            const token = await getToken();
            if (token) {
                const response = await requestProductAccess(productId, teamId, token, appId, justification);
                const sub = response.data;
                set((state) => ({
                    subscriptions: [sub, ...state.subscriptions]
                }));
            }
        } catch (error) {
            console.error("Failed to add subscription", error);
        }
    },

    processApproval: async (id, decision, justification, getToken) => {
        const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        set((state) => ({
            approvalRequests: state.approvalRequests.map(r => r.id === id ? { ...r, status: newStatus } : r)
        }));

        if (getToken) {
            try {
                const token = await getToken();
                if (token) {
                    await updateApproval(id, newStatus, justification, token);
                }
            } catch (error) {
                console.error("Failed to process approval", error);
            }
        }
    },

    fetchAuditLogs: async (entityId) => {
        try {
            const response = await getAuditLogs(entityId);
            set({ auditLogs: response.data });
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        }
    },

    updateProduct: async (id, updates) => {
        set((state) => ({
            products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        try {
            await apiUpdateProduct(id, updates);
        } catch (error) {
            console.error("Failed to update product", error);
        }
    },

    updateAPI: async (id, updates) => {
        // Mock update for API specific fields (like ownerTeamId)
        // In a real app, we would update state.products.flat().apis or similar
        // Here we just log it as it's primarily for the Admin Mapping flow which refreshes or relies on logs
        console.log(`[DataSlice] updateAPI called for ${id}`, updates);
        // Note: Deep nested structure update in Zustand for Products->APIs is complex without Immer
        // For this demo, we assume the backend handles it and next fetch resolves it.
    },

    updateTeam: async (id, updates) => {
        set((state) => ({
            teams: state.teams.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
        try {
            await apiUpdateTeam(id, updates);
        } catch (error) {
            console.error("Failed to update team", error);
        }
    },

    addTeam: async (team) => {
        // Optimistic update
        set((state) => ({
            teams: [...state.teams, team]
        }));
        try {
            await apiCreateTeam(team);
        } catch (error) {
            console.error("Failed to create team", error);
            // Revert on failure (simple pop for now, or fetch fresh)
            set((state) => ({
                teams: state.teams.filter(t => t.id !== team.id)
            }));
        }
    },

    requestProductPromotion: async (productId, targetEnv, getToken) => {
        if (!getToken) return;
        try {
            const token = await getToken();
            if (token) {
                const response = await apiRequestPromotion(productId, targetEnv, token);
                const req = response.data;
                set((state) => ({
                    approvalRequests: [req, ...state.approvalRequests]
                }));
            }
        } catch (error: any) {
            console.error("Failed to request promotion", error);
            throw error; // Re-throw to let UI handle toasts
        }
    },

    fetchAppRegistrations: async (teamId) => {
        try {
            const response = await getAppRegistrations(teamId);
            set({ appRegistrations: response.data });
        } catch (error) {
            console.error("Failed to fetch app registrations", error);
        }
    },

    addAppRegistration: async (app) => {
        try {
            const response = await apiAddAppRegistration(app);
            set((state) => ({
                appRegistrations: [response.data, ...state.appRegistrations]
            }));
        } catch (error) {
            console.error("Failed to add app registration", error);
        }
    }
});
