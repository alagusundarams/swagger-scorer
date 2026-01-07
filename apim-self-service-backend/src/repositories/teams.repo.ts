import { query } from '../services/core/db.js';

/**
 * TeamsRepository
 * 
 * Handles all database operations for Teams.
 */
export class TeamsRepository {
    /**
     * Get a team by ID
     */
    async getTeamById(teamId: string) {
        return await query('SELECT azure_ad_group_id, name FROM teams WHERE id = $1', [teamId]);
    }
}
