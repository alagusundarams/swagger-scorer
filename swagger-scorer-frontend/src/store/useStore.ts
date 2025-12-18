import { create } from 'zustand';
import { User } from '../mocks';
import type { Notification } from '../types/notifications';

interface AppState {
    user: User | null;
    activeTeamId: string;
    notifications: Notification[];
    setUser: (user: User | null) => void;
    setActiveTeamId: (id: string) => void;
    setNotifications: (notifications: Notification[]) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null, // Start null, SSO login will set this via setUser()
    activeTeamId: 'all',
    notifications: [], // Start empty, will be fetched after login

    setUser: (user) => set({ user }),
    setActiveTeamId: (activeTeamId) => set({ activeTeamId }),

    setNotifications: (notifications) => set({ notifications }),

    markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        )
    })),

    markAllNotificationsAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),

    logout: () => set({ user: null, activeTeamId: 'all', notifications: [] }),
}));
