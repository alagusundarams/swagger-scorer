/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

import { query } from './db.js';

/**
 * Fetch all products with their associated APIs and calculated subscriber counts
 */
export async function getAllProducts() {
    // 1. Fetch products with calculated subscriber count
    const productRes = await query(`
        SELECT p.*, 
               t.name as owner_team_name,
               COALESCE(sub_counts.active_subscribers, 0) as calculated_subscriber_count
        FROM products p
        LEFT JOIN teams t ON p.owner_team_id = t.id
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as active_subscribers
            FROM subscriptions
            WHERE subscriptions.product_id = p.id
            AND subscriptions.state = 'active'
        ) sub_counts ON true
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
        subscriberCount: p.calculated_subscriber_count,
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
