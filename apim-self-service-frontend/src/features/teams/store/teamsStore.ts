import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team } from '../types/teamTypes';
import { teamsApi } from '../api/teamsClient';

interface TeamsState {
    teams: Team[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchTeams: () => Promise<void>;
    addTeam: (team: Partial<Team>) => Promise<void>;
    modifyTeam: (id: string, updates: Partial<Team>) => Promise<void>;
}

/**
 * Teams Store - FEATURE DOMAIN
 */
export const useTeamsStore = create<TeamsState>()(
    persist(
        (set) => ({
            teams: [],
            isLoading: false,
            error: null,

            fetchTeams: async () => {
                set({ isLoading: true, error: null });
                try {
                    const teams = await teamsApi.getTeams();
                    set({ teams, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            addTeam: async (teamData) => {
                try {
                    const newTeam = await teamsApi.createTeam(teamData);
                    set((state) => ({ teams: [...state.teams, newTeam] }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            modifyTeam: async (id, updates) => {
                try {
                    const updatedTeam = await teamsApi.updateTeam(id, updates);
                    set((state) => ({
                        teams: state.teams.map(t => t.id === id ? updatedTeam : t)
                    }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            }
        }),
        { name: 'teams-storage' }
    )
);
