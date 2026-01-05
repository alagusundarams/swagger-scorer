import { api as baseClient } from '../../../api/baseClient';
import type { Subscription, AppRegistration } from '../../../shared/types/domain';

/**
 * Consumer API Client
 * 
 * Decentralized from inventory module.
 */
export const getSubscriptions = async (): Promise<Subscription[]> => {
    const res = await baseClient.get('/subscriptions');
    return res.data.subscriptions || [];
};

export const requestProductAccess = async (productId: string, teamId: string): Promise<Subscription> => {
    const res = await baseClient.post('/subscriptions', { productId, teamId });
    return res.data.subscription;
};

export const updateSubscription = async (subId: string, updates: Partial<Subscription>): Promise<Subscription> => {
    const res = await baseClient.patch(`/subscriptions/${subId}`, updates);
    return res.data;
};

export const getAppRegistrations = async (teamId?: string): Promise<AppRegistration[]> => {
    const res = await baseClient.get(`/apps${teamId ? `?teamId=${teamId}` : ''}`);
    return res.data;
};

export const addAppRegistration = async (data: Partial<AppRegistration>): Promise<AppRegistration> => {
    const res = await baseClient.post('/apps', data);
    return res.data;
};

export const getSubscriptionSecrets = async (subId: string): Promise<{ primaryKey: string, secondaryKey: string }> => {
    const res = await baseClient.get(`/subscriptions/${subId}/secrets`);
    return res.data.secrets;
};

export const consumerApi = {
    getSubscriptions,
    requestProductAccess,
    updateSubscription,
    getAppRegistrations,
    addAppRegistration,
    getSubscriptionSecrets
};
