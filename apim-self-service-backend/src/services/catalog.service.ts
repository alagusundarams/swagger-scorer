/**
 * @fileoverview Catalog Service
 * 
 * Logic for fetching business entities (Products, APIs, Teams) from the database.
 */

import { query } from './db.js';

/**
 * Fetch all products with their associated APIs
 */
export async function getAllProducts() {
    // 1. Fetch products
    const productRes = await query(`
        SELECT p.*, t.name as owner_team_name
        FROM products p
        LEFT JOIN teams t ON p.owner_team_id = t.id
        ORDER BY p.display_name ASC
    `);

    // 2. Fetch all APIs
    const apiRes = await query(`
        SELECT a.*, o.json_data as operations_json
        FROM apis a
        LEFT JOIN LATERAL (
            SELECT json_agg(op.*) as json_data
            FROM operations op
            WHERE op.api_id = a.id
        ) o ON true
    `);

    // 3. Assemble
    const products = productRes.rows.map(p => ({
        ...p,
        displayName: p.display_name,
        ownerTeamId: p.owner_team_id,
        ownerTeamName: p.owner_team_name,
        subscriberCount: p.subscriber_count,
        qualityScore: p.quality_score,
        managementMode: p.management_mode,
        terraformPipelineUrl: p.terraform_pipeline_url,
        apis: apiRes.rows
            .filter(a => a.product_id === p.id)
            .map(a => ({
                ...a,
                displayName: a.display_name,
                operations: a.operations_json || []
            }))
    }));

    return products;
}

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

/**
 * Fetch all subscriptions
 */
export async function getAllSubscriptions() {
    const res = await query(`
        SELECT s.*, p.display_name as product_name, t.name as team_name
        FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        JOIN teams t ON s.subscriber_team_id = t.id
        ORDER BY s.created_at DESC
    `);

    return res.rows.map(s => ({
        ...s,
        productId: s.product_id,
        subscriberTeamId: s.subscriber_team_id,
        primaryKey: { name: 'Primary', value: '••••••••' }, // Do not expose keys in list view
        secondaryKey: { name: 'Secondary', value: '••••••••' }
    }));
}
