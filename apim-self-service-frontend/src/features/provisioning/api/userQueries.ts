/**
 * User & Provisioning Query Hooks
 * 
 * Centralized data fetching for user profile, dashboard, and onboarding.
 */
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../auth/api/authClient';
import { getTeams } from '../../teams/api/teamsClient';
import { getSubscriptions } from '../../consumer/api/consumerClient';
import { getApprovals } from '../../governance/api/governanceClient';

export const userKeys = {
    profile: ['user', 'profile'] as const,
    teams: ['user', 'teams'] as const,
    subscriptions: ['user', 'subscriptions'] as const,
    approvals: ['user', 'approvals'] as const,
    onboardingConfig: (productId: string) => ['onboarding', 'config', productId] as const,
};

/**
 * Hook to fetch current user profile
 */
export function useUserProfileQuery() {
    return useQuery({
        queryKey: userKeys.profile,
        queryFn: async () => {
            const res = await getCurrentUser();
            return res.data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes (profile rarely changes)
    });
}

/**
 * Hook to fetch user's teams
 */
export function useMyTeamsQuery() {
    return useQuery({
        queryKey: userKeys.teams,
        queryFn: getTeams,
    });
}

/**
 * Hook to fetch user's subscriptions
 */
export function useMySubscriptionsQuery() {
    return useQuery({
        queryKey: userKeys.subscriptions,
        queryFn: getSubscriptions,
    });
}

/**
 * Hook to fetch approvals for the user
 */
export function useMyApprovalsQuery() {
    return useQuery({
        queryKey: userKeys.approvals,
        queryFn: getApprovals,
    });
}
