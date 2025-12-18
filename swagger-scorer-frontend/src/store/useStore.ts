import { create } from 'zustand';
import { type Product, type Subscription, type Team, type User, type ApprovalRequest } from '../types/entities';
import type { Notification } from '../types/notifications';
import { getProducts, getTeams, getSubscriptions, requestProductAccess, updateSubscription as apiUpdateSubscription, getApprovals, updateApproval } from '../features/analyzer/api/client';

interface AppState {
    // Auth & Identity
    user: User | null;
    activeTeamId: string;

    // Core Data (Isolated in Store)
    products: Product[];
    subscriptions: Subscription[];
    teams: Team[];
    approvalRequests: ApprovalRequest[];

    // UI & Feedback
    notifications: Notification[];

    // Actions
    setUser: (user: User | null) => void;
    setActiveTeamId: (id: string) => void;

    // Data Actions
    fetchInitialData: (getToken?: () => Promise<string | null>) => Promise<void>;
    updateSubscription: (id: string, updates: Partial<Subscription>, getToken?: () => Promise<string | null>) => Promise<void>;
    addSubscription: (productId: string, teamId: string, getToken?: () => Promise<string | null>) => Promise<void>;

    // Notification Actions
    setNotifications: (notifications: Notification[]) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;

    processApproval: (id: string, decision: 'APPROVE' | 'REJECT', getToken?: () => Promise<string | null>) => Promise<void>;

    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    activeTeamId: 'all',

    products: [],
    subscriptions: [],
    teams: [],

    notifications: [],

    setUser: (user: User | null) => set({ user }),
    setActiveTeamId: (activeTeamId: string) => set({ activeTeamId }),

    fetchInitialData: async (getToken) => {
        try {
            const [productsRes, teamsRes, approvalsRes] = await Promise.all([
                getProducts(),
                getTeams(),
                getApprovals()
            ]);

            const allTeams = teamsRes.data;

            // Mock notifications for testing
            const mockNotifications: Notification[] = [
                {
                    id: 'notif-1',
                    type: 'approval',
                    title: 'New Approval Request',
                    message: 'Team Alpha is requesting access to Payment Gateway API',
                    timestamp: '5 minutes ago',
                    read: false,
                    navigateTo: '/approvals'
                },
                {
                    id: 'notif-2',
                    type: 'approval',
                    title: 'Subscription Approval Pending',
                    message: 'Team Beta requested access to Customer Service API',
                    timestamp: '2 hours ago',
                    read: false,
                    navigateTo: '/approvals'
                },
                {
                    id: 'notif-3',
                    type: 'success',
                    title: 'API Quality Improved',
                    message: 'Your User Service API quality score is now 95/100',
                    timestamp: '1 day ago',
                    read: true,
                    navigateTo: '/products/prod-user-service'
                }
            ];

            set({
                products: productsRes.data,
                teams: allTeams,
                approvalRequests: approvalsRes.data,
                notifications: mockNotifications
            });

            // Map user teams (Group IDs) to Team Entity IDs if not already mapped
            set((state: AppState) => {
                if (state.user) {
                    const mappedTeamIds = state.user.teams.map(groupIdOrId => {
                        const team = allTeams.find(t => t.azureAdGroupId === groupIdOrId || t.id === groupIdOrId);
                        return team ? team.id : groupIdOrId;
                    });
                    return { user: { ...state.user, teams: mappedTeamIds } };
                }
                return {};
            });

            if (getToken) {
                const token = await getToken();
                if (token) {
                    const subsRes = await getSubscriptions(token);
                    set({ subscriptions: subsRes.data });
                }
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    },

    updateSubscription: async (id: string, updates: Partial<Subscription>, getToken) => {
        // Optimistic update
        set((state: AppState) => ({
            subscriptions: state.subscriptions.map((s: Subscription) => s.id === id ? { ...s, ...updates } : s)
        }));

        if (getToken && updates.state && (updates.state === 'active' || updates.state === 'rejected')) {
            try {
                const token = await getToken();
                if (token) {
                    await apiUpdateSubscription(id, updates.state, token);
                }
            } catch (error) {
                console.error("Failed to update subscription", error);
                // Revert optimistic update (todo: proper rollback)
            }
        }
    },

    addSubscription: async (productId: string, teamId: string, getToken) => {
        if (!getToken) return;
        try {
            const token = await getToken();
            if (token) {
                const response = await requestProductAccess(productId, teamId, token);
                const sub = response.data;
                set((state: AppState) => ({
                    subscriptions: [sub, ...state.subscriptions]
                }));
            }
        } catch (error) {
            console.error("Failed to add subscription", error);
        }
    },

    approvalRequests: [],

    processApproval: async (id: string, decision: 'APPROVE' | 'REJECT', getToken) => {
        const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

        // Optimistic Update
        set((state: AppState) => ({
            approvalRequests: state.approvalRequests.map(r => r.id === id ? { ...r, status: newStatus } : r)
        }));

        if (getToken) {
            try {
                const token = await getToken();
                if (token) {
                    await updateApproval(id, newStatus, token);
                }
            } catch (error) {
                console.error("Failed to process approval", error);
                // Revert optimistic update could be added here
            }
        }
    },

    setNotifications: (notifications: Notification[]) => set({ notifications }),

    markNotificationAsRead: (id: string) => set((state: AppState) => ({
        notifications: state.notifications.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
        )
    })),

    markAllNotificationsAsRead: () => set((state: AppState) => ({
        notifications: state.notifications.map((n: Notification) => ({ ...n, read: true }))
    })),

    logout: () => set({ user: null, activeTeamId: 'all', notifications: [] }),
}));

