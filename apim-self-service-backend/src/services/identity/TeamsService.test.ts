import { describe, it, expect, vi } from 'vitest';
import * as teamsService from './TeamsService.js';
import { query } from '../core/db.js';

vi.mock('../core/db.js', () => ({
    query: vi.fn()
}));

describe('Teams Service', () => {
    it('should get all teams', async () => {
        (query as any).mockResolvedValueOnce({ rows: [{ id: 'team-1', name: 'Alpha' }] });
        const teams = await teamsService.getAllTeams();
        expect(teams).toHaveLength(1);
        expect(teams[0].id).toBe('team-1');
    });

    it('should create a team', async () => {
        const mockTeam = { id: 't1', name: 'T1', description: 'desc', azure_ad_group_id: 'g1' };
        (query as any).mockResolvedValueOnce({ rows: [mockTeam] });
        const result = await teamsService.createTeam(mockTeam);
        expect(result.id).toBe('t1');
    });

    it('should update a team', async () => {
        const mockTeam = { id: 't1', name: 'Updated' };
        (query as any).mockResolvedValueOnce({ rows: [mockTeam] });
        const result = await teamsService.updateTeam('t1', { name: 'Updated' });
        expect(result.name).toBe('Updated');
    });
});
