/**
 * Orphaned Resources Service
 * 
 * Returns resources that exist in APIM but not in our DB
 */

import { query } from '../core/db.js';

export interface OrphanedResource {
    id: string;
    name: string;
    type: 'product' | 'api' | 'subscription';
    environment: string;
    details: any;
    isOrphaned: boolean;
}

/**
 * Get all orphaned resources
 * These are resources in APIM not tracked in our database
 */
export async function getOrphanedResources(environment?: string): Promise<OrphanedResource[]> {
    // This would query the apim_raw_data table or an orphaned_resources table
    // For now, return empty array since we need to implement the orphan detection logic

    const whereClause = environment ? 'WHERE environment = $1' : '';
    const params = environment ? [environment] : [];

    const result = await query(`
        SELECT 
            id,
            name,
            type,
            environment,
            details,
            true as is_orphaned
        FROM orphaned_resources
        ${whereClause}
        ORDER BY environment, type, name
    `, params, 'GetOrphanedResources');

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        environment: row.environment,
        details: row.details,
        isOrphaned: row.is_orphaned
    }));
}

/**
 * Get AD groups from database
 */
export async function getAdGroups() {
    const result = await query(`
        SELECT id, name, description, ad_group_id,created_at
        FROM teams
        ORDER BY name ASC
    `, [], 'getAdGroups');

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        adGroupId: row.ad_group_id,
        createdAt: row.created_at
    }));
}
