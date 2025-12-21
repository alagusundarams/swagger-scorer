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
    return res.rows.map(t => ({
        ...t,
        azureAdGroupId: t.azure_ad_group_id,
        memberCount: t.member_count
    }));
}
