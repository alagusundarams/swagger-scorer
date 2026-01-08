/**
 * Admin Query Hooks
 * 
 * TanStack Query wrappers for admin-related API calls.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    updateTeam,
    updateProduct,
    getSubscriptions,
    adoptSubscription,
    getOrphanNamedValues,
    adoptNamedValue,
    getOrphanAppRegistrations,
    adoptAppRegistration,
    getOrphanBackends,
    adoptBackend,
    getAdminDashboard
} from './adminClient';
import type { Team, Product } from '../../../shared/types/domain';
import { inventoryKeys } from '../../inventory/api/inventoryQueries';

// Query Keys
export const adminKeys = {
    dashboard: ['admin', 'dashboard'] as const,
    subscriptions: ['admin', 'subscriptions'] as const,
    orphans: (type: string, env: string) => ['admin', 'orphans', type, env] as const,
};

/**
 * Hook to fetch Admin Dashboard stats
 */
export function useAdminDashboardQuery() {
    return useQuery({
        queryKey: adminKeys.dashboard,
        queryFn: async () => {
            const res = await getAdminDashboard();
            return res.data;
        }
    });
}

/**
 * Hook to fetch all subscriptions (Admin)
 */
export function useAdminSubscriptionsQuery() {
    return useQuery({
        queryKey: adminKeys.subscriptions,
        queryFn: getSubscriptions,
    });
}

/**
 * Hook to fetch Orphaned Named Values
 */
export function useOrphanNamedValuesQuery(environment: string) {
    return useQuery({
        queryKey: adminKeys.orphans('named-values', environment),
        queryFn: () => getOrphanNamedValues(environment),
        enabled: !!environment,
    });
}

/**
 * Hook to fetch Orphaned App Registrations
 */
export function useOrphanAppRegistrationsQuery(environment: string) {
    return useQuery({
        queryKey: adminKeys.orphans('app-registrations', environment),
        queryFn: () => getOrphanAppRegistrations(environment),
        enabled: !!environment,
    });
}

/**
 * Hook to fetch Orphaned Backends
 */
export function useOrphanBackendsQuery(environment: string) {
    return useQuery({
        queryKey: adminKeys.orphans('backends', environment),
        queryFn: () => getOrphanBackends(environment),
        enabled: !!environment,
    });
}

/**
 * Mutations
 */
export function useUpdateTeamMutation() {
    return useMutation({
        mutationFn: ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) =>
            updateTeam(teamId, updates),
        onSuccess: () => {
            // Team updates handled by eventBus mostly
        }
    });
}

export function useUpdateProductMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ productId, updates }: { productId: string; updates: Partial<Product> }) =>
            updateProduct(productId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.global });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orphans'] });
        }
    });
}

export function useAdoptSubscriptionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ subscriptionId, teamId }: { subscriptionId: string; teamId: string }) =>
            adoptSubscription(subscriptionId, teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.subscriptions });
        }
    });
}

export function useAdoptNamedValueMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, environment, data }: { id: string, environment: string, data: any }) =>
            adoptNamedValue(id, environment, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.orphans('named-values', variables.environment) });
        }
    });
}

export function useAdoptAppRegistrationMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) =>
            adoptAppRegistration(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orphans', 'app-registrations'] });
        }
    });
}

export function useAdoptBackendMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, environment, data }: { id: string, environment: string, data: any }) =>
            adoptBackend(id, environment, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.orphans('backends', variables.environment) });
        }
    });
}
