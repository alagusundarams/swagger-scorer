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

    processApproval: (id: string, decision: 'APPROVE' | 'REJECT', getToken?: () => Promise<string | null>) => Promise<void>;
    setNotifications: (notifications: Notification[]) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
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

            // Mock notifications for testing (following notification strategy)
            // Notifications = status updates about YOUR submissions/actions
            // NOT duplicate of Approvals tab (which shows work YOU must do)
            const mockNotifications: Notification[] = [
                {
                    id: 'notif-0',
                    type: 'governance',
                    title: 'Privacy Violation Prevented',
                    message: 'Automatic lockout triggered: Consumer Team "Alpha" attempted to access private product "Payments Core v2". Access successfully denied.',
                    timestamp: 'Just now',
                    read: false,
                    navigateTo: '/'
                },
                {
                    id: 'notif-1',
                    type: 'success',
                    title: 'Subscription Approved',
                    message: 'Your request for Payment Gateway API was approved by Platform Team',
                    timestamp: '2 hours ago',
                    read: false,
                    navigateTo: '/' // Dashboard - user can see their subscriptions
                },
                {
                    id: 'notif-2',
                    type: 'warning',
                    title: 'Access Expiring Soon',
                    message: 'Your Customer Service API access expires in 7 days',
                    timestamp: '1 day ago',
                    read: false,
                    navigateTo: '/' // Dashboard - renewal section
                },
                {
                    id: 'notif-3',
                    type: 'info',
                    title: 'API Deployed to Production',
                    message: 'Payment Gateway API v2.1 successfully deployed to PROD',
                    timestamp: '3 days ago',
                    read: true,
                    navigateTo: '/products/prod-payment' // Product detail page
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

    addSubscription: async (productId: string, teamId: string, getToken?: () => Promise<string | null>) => {
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

    processApproval: async (id: string, decision: 'APPROVE' | 'REJECT', getToken?: () => Promise<string | null>) => {
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

    updateProduct: (id: string, updates: Partial<Product>) => set((state: AppState) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => set((state: AppState) => ({
        notifications: [
            {
                ...notification,
                id: `notif-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: 'Just now',
                read: false
            },
            ...state.notifications
        ]
    })),
    logout: () => set({ user: null, activeTeamId: 'all', notifications: [] }),
}));
