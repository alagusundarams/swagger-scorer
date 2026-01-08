
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teamsClient';
import { useStore } from '../../../store/useStore';

// Keys
export const teamKeys = {
    all: ['teams'] as const,
    lists: () => [...teamKeys.all, 'list'] as const,
    detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
};

// Hooks
export const useTeamsQuery = () => {
    return useQuery({
        queryKey: teamKeys.lists(),
        queryFn: teamsApi.getTeams,
        staleTime: 1000 * 60 * 10, // Teams change rarely
    });
};

export const useCreateTeamMutation = () => {
    const queryClient = useQueryClient();
    const addNotification = useStore((state) => state.addNotification);

    return useMutation({
        mutationFn: teamsApi.createTeam,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
            addNotification({ type: 'success', title: 'Team Created', message: `Team "${data.name}" created successfully` });
        },
        onError: (error: any) => {
            addNotification({ type: 'error', title: 'Creation Failed', message: error.message || 'Failed to create team' });
        }
    });
};
