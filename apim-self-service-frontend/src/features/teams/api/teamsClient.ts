import { api as baseClient } from '../../../api/baseClient';
import type { Team } from '../types/teamTypes';

/**
 * Teams API Client
 * 
 * Decentralized from inventory module.
 */
export const getTeams = async (): Promise<Team[]> => {
    const res = await baseClient.get('/teams');
    return res.data;
};

export const createTeam = async (data: Partial<Team>): Promise<Team> => {
    const res = await baseClient.post('/teams', data);
    return res.data;
};

export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<Team> => {
    const res = await baseClient.put(`/teams/${teamId}`, updates);
    return res.data;
};

export const teamsApi = {
    getTeams,
    createTeam,
    updateTeam
};
