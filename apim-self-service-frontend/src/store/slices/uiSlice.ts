import { StateCreator } from 'zustand';
import type { Notification } from '../../types/notifications';

export interface UISlice {
    notifications: Notification[];
    pageTitle: string;
    setNotifications: (notifications: Notification[]) => void;
    setPageTitle: (title: string) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    notifications: [],
    pageTitle: 'Dashboard',

    setNotifications: (notifications: Notification[]) => set({ notifications }),
    setPageTitle: (pageTitle: string) => set({ pageTitle }),

    markNotificationAsRead: (id: string) => set((state) => ({
        notifications: state.notifications.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
        )
    })),

    markAllNotificationsAsRead: () => set((state) => ({
        notifications: state.notifications.map((n: Notification) => ({ ...n, read: true }))
    })),

    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => set((state) => ({
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
});
