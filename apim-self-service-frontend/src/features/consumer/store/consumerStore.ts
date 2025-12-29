import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Subscription, AppRegistration } from '../types/consumerTypes';
import { consumerApi } from '../api/consumerClient';

interface ConsumerState {
    subscriptions: Subscription[];
    appRegistrations: AppRegistration[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchSubscriptions: () => Promise<void>;
    requestAccess: (productId: string, teamId: string) => Promise<void>;
    fetchAppRegistrations: (teamId?: string) => Promise<void>;
    registerApp: (app: Partial<AppRegistration>) => Promise<void>;
}

/**
 * Consumer Store - FEATURE DOMAIN
 */
export const useConsumerStore = create<ConsumerState>()(
    persist(
        (set) => ({
            subscriptions: [],
            appRegistrations: [],
            isLoading: false,
            error: null,

            fetchSubscriptions: async () => {
                set({ isLoading: true, error: null });
                try {
                    const subs = await consumerApi.getSubscriptions();
                    set({ subscriptions: subs, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            requestAccess: async (productId, teamId) => {
                try {
                    const sub = await consumerApi.requestProductAccess(productId, teamId);
                    set((state) => ({ subscriptions: [sub, ...state.subscriptions] }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            fetchAppRegistrations: async (teamId) => {
                set({ isLoading: true, error: null });
                try {
                    const apps = await consumerApi.getAppRegistrations(teamId);
                    set({ appRegistrations: apps, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            registerApp: async (appData) => {
                try {
                    const newApp = await consumerApi.addAppRegistration(appData);
                    set((state) => ({ appRegistrations: [newApp, ...state.appRegistrations] }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            }
        }),
        { name: 'consumer-storage' }
    )
);
