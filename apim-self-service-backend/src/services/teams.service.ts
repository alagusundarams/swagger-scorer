/**
 * @fileoverview Teams Service
 * 
 * Handles team-related queries
 */

import { query } from './db.js';

/**
 * Fetch all teams
 */
export async function getAllTeams() {
    const res = await query('SELECT * FROM teams ORDER BY name ASC');
    return res.rows.map((t: any) => ({
        ...t,
        azureAdGroupId: t.azure_ad_group_id,
        memberCount: t.member_count
    }));
}

export async function createTeam(team: any) {
    const res = await query(`
        INSERT INTO teams (id, name, description, azure_ad_group_id, member_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [team.id, team.name, team.description, team.azure_ad_group_id, team.member_count || 0]);
    return res.rows[0];
}

export async function updateTeam(id: string, updates: any) {
    const res = await query(`
        UPDATE teams 
        SET name = COALESCE($1, name), 
            description = COALESCE($2, description),
            azure_ad_group_id = COALESCE($3, azure_ad_group_id)
        WHERE id = $4
        RETURNING *
    `, [updates.name, updates.description, updates.azureAdGroupId, id]);
    return res.rows[0];
}
