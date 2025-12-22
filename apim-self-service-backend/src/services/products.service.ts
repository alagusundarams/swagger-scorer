/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

import { query } from './db.js';

/**
 * Fetch all products with their associated APIs and calculated subscriber counts
 * @param environment Optional environment filter (DEV, QA, STAGE, PROD)
 */
export async function getAllProducts(environment?: string) {
    // Build WHERE clause for environment filter
    const whereClause = environment ? `WHERE p.environment = $1` : '';
    const queryParams = environment ? [environment] : [];

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
        ${whereClause}
        ORDER BY p.display_name ASC
    `, queryParams);

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

    // 3. Assemble with complete field mapping
    const products = productRes.rows.map(p => ({
        // Core fields
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        version: p.version,
        description: p.description,
        state: p.state,
        type: p.type,
        environment: p.environment,

        // Team ownership
        ownerTeamId: p.owner_team_id,
        ownerTeamName: p.owner_team_name,

        // Metrics
        subscriberCount: p.calculated_subscriber_count,
        qualityScore: p.quality_score,

        // Management
        management_mode: p.management_mode,
        terraform_pipeline_url: p.terraform_pipeline_url,
        git_repo_url: p.git_repo_url,
        lastDeployedCommitHash: p.last_deployed_commit_hash,

        // Identity (App Registration)
        identity: p.identity_client_id ? {
            clientId: p.identity_client_id,
            displayName: p.identity_display_name,
            appIdUri: p.identity_app_id_uri
        } : undefined,

        // Timestamps
        createdAt: p.created_at,
        updatedAt: p.updated_at,

        // APIs
        apis: apiRes.rows
            .filter(a => a.product_id === p.id)
            .map(a => ({
                id: a.id,
                name: a.name,
                displayName: a.display_name,
                description: a.description,
                path: a.path,
                qualityScore: a.quality_score,
                originTeamId: a.origin_team_id,
                operations: a.operations_json || []
            }))
    }));

    return products;
}

/**
 * Helper to fetch the Git repository URL for a given resource (API or Product).
 * Since APIs are children of Products, we lookup via the parent product.
 */
export async function getRepoUrlForResource(resourceId: string): Promise<string | null> {
    // 1. Try if resourceId is a Product
    const productRes = await query('SELECT git_repo_url FROM products WHERE id = $1', [resourceId]);
    if (productRes.rows[0]?.git_repo_url) {
        return productRes.rows[0].git_repo_url;
    }

    // 2. Try if resourceId is an API (lookup parent product)
    const apiRes = await query(`
        SELECT p.git_repo_url 
        FROM products p
        JOIN apis a ON a.product_id = p.id
        WHERE a.id = $1
    `, [resourceId]);

    return apiRes.rows[0]?.git_repo_url || null;
}
