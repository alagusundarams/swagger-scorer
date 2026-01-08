
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consumerApi } from './consumerClient';
import { useStore } from '../../../store/useStore';

// Keys
export const consumerKeys = {
    all: ['consumer'] as const,
    subscriptions: () => [...consumerKeys.all, 'subscriptions'] as const,
    apps: (teamId?: string) => [...consumerKeys.all, 'apps', teamId || 'all'] as const,
    secrets: (subId: string) => [...consumerKeys.all, 'secrets', subId] as const,
};

// -- SUBSCRIPTIONS --

export const useSubscriptionsQuery = () => {
    return useQuery({
        queryKey: consumerKeys.subscriptions(),
        queryFn: consumerApi.getSubscriptions,
        staleTime: 1000 * 60 * 2, // 2 mins
    });
};

export const useRequestAccessMutation = () => {
    const queryClient = useQueryClient();
    const addNotification = useStore((state) => state.addNotification);

    return useMutation({
        mutationFn: ({ productId, teamId }: { productId: string; teamId: string }) =>
            consumerApi.requestProductAccess(productId, teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: consumerKeys.subscriptions() });
            addNotification({ type: 'success', title: 'Request Sent', message: 'Access request submitted successfully' });
        },
        onError: (error: any) => {
            addNotification({ type: 'error', title: 'Request Failed', message: error.message || 'Failed to request access' });
        }
    });
};

// -- APP REGISTRATIONS --

export const useAppRegistrationsQuery = (teamId?: string) => {
    return useQuery({
        queryKey: consumerKeys.apps(teamId),
        queryFn: () => consumerApi.getAppRegistrations(teamId),
        enabled: !!teamId, // Only fetch if we have a team context (or fetch all if logic supports it, but usually restricted)
    });
};

export const useAddAppRegistrationMutation = () => {
    const queryClient = useQueryClient();
    const addNotification = useStore((state) => state.addNotification);

    return useMutation({
        mutationFn: consumerApi.addAppRegistration,
        onSuccess: (data) => {
            // Invalidate generic and specific
            queryClient.invalidateQueries({ queryKey: consumerKeys.all });
            addNotification({ type: 'success', title: 'App Registered', message: `App "${data.displayName}" registered successfully` });
        },
        onError: (error: any) => {
            addNotification({ type: 'error', title: 'Registration Failed', message: error.message || 'Failed to register app' });
        }
    });
};


// -- SECRETS --

export const useSubscriptionSecretsQuery = (subId: string, enabled: boolean = false) => {
    return useQuery({
        queryKey: consumerKeys.secrets(subId),
        queryFn: () => consumerApi.getSubscriptionSecrets(subId),
        enabled: enabled && !!subId,
        staleTime: 1000 * 60 * 5, // Secrets rarely change
    });
};
