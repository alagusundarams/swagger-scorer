/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

import { query } from './db.js';
import { updateProductMetadata } from './apim.service.js';

/**
 * Fetch all products with their associated APIs and calculated subscriber counts
 * @param environment Optional environment filter (DEV, QA, STAGE, PROD)
 * @param userRole Optional user role (admin sees all, others see team-filtered)
 * @param teamId Optional team ID filter (ignored if userRole is 'admin')
 */
export async function getAllProducts(environment?: string, userRole?: string, teamId?: string) {
    // Build WHERE clauses
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (environment) {
        whereConditions.push(`p.environment = $${paramIndex++}`);
        queryParams.push(environment);
    }

    // Only filter by team if user is NOT admin
    if (teamId && userRole !== 'admin') {
        whereConditions.push(`p.owner_team_id = $${paramIndex++}`);
        queryParams.push(teamId);
    }

    const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const productRes = await query(`
        SELECT p.*, 
               t.display_name as owner_team_name,
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
        authorizedTeams: p.authorized_teams || [],

        // Metrics
        subscriberCount: p.calculated_subscriber_count,
        qualityScore: p.quality_score,

        // Management
        managementMode: p.management_mode,
        terraformPipelineUrl: p.terraform_pipeline_url,
        gitRepoUrl: p.git_repo_url,
        gitFilePath: p.git_file_path,
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
                gitRepoUrl: a.git_repo_url,
                gitFilePath: a.git_file_path,
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

/**
 * Update a product's metadata (e.g. ownership assignment)
 * @param id The product ID
 * @param data Partial product data
 */
export async function updateProduct(id: string, data: { ownerTeamId?: string }) {
    if (!id) throw new Error('Product ID is required');

    // 1. Fetch current product to check type
    const productRes = await query('SELECT type FROM products WHERE id = $1', [id]);
    if (productRes.rows.length === 0) throw new Error(`Product ${id} not found`);
    const productType = productRes.rows[0].type;

    // 2. Update the Product
    const result = await query(
        'UPDATE products SET owner_team_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [data.ownerTeamId, id]
    );

    // 3. Apply Cascading Rules
    if (data.ownerTeamId) {
        // Fetch team's AD Group ID for ARM Sync
        const teamRes = await query('SELECT azure_ad_group_id, name FROM teams WHERE id = $1', [data.ownerTeamId]);
        const team = teamRes.rows[0];

        if (productType === 'grp') {
            // GRP Rule: Do NOT update APIs. They are owned by individual producer teams.
            console.log(`[ProductsService] GRP Rule: Updated product ${id} owner. APIs retain origin owners.`);
        } else {
            // Standard Rule: Update all associated APIs to the same owner team.
            console.log(`[ProductsService] Standard Rule: Cascading ownership update for product ${id} to all its APIs.`);
            await query(
                'UPDATE apis SET origin_team_id = $1, updated_at = NOW() WHERE product_id = $2',
                [data.ownerTeamId, id]
            );
        }

        // 4. Trigger ARM Metadata Sync
        if (team?.azure_ad_group_id) {
            // In a real app, 'id' is the product name (e.g. 'payments')
            // And we'd loop through environments if the product exists in multiple.
            // For this POC, we'll use the record's environment.
            const env = result.rows[0].environment || 'DEV';
            updateProductMetadata(result.rows[0].name, team.azure_ad_group_id, env)
                .catch(err => console.error('[ProductsService] ARM Sync Failed Background:', err));
        }
    }

    return result.rows[0];
}

/**
 * Fetch a unified view of all products and APIs across regions for the Admin dashboard.
 * Groups by resource name to identify regional mismatches.
 */
export async function getGlobalInventory() {
    // 1. Grouped Products
    const productRes = await query(`
        SELECT 
            p.name, 
            p.display_name as "displayName", 
            p.type, 
            p.owner_team_id as "ownerTeamId", 
            t.name as "ownerTeamName",
            json_agg(json_build_object(
                'id', p.id,
                'environment', p.environment,
                'state', p.state,
                'gitRepoUrl', p.git_repo_url,
                'managementMode', p.management_mode,
                'qualityScore', p.quality_score,
                'reconciliationStatus', CASE 
                    WHEN p.management_mode = 'PORTAL_MANAGED' AND (p.git_repo_url IS NULL OR p.git_repo_url = '') THEN 'GHOST'
                    WHEN p.management_mode = 'PORTAL_MANAGED' THEN 'MANUAL'
                    ELSE 'RECONCILED'
                END
            )) as deployments
        FROM products p
        LEFT JOIN teams t ON p.owner_team_id = t.id
        GROUP BY p.name, p.display_name, p.type, p.owner_team_id, t.name
        ORDER BY p.display_name ASC
    `);

    // 2. Grouped APIs
    const apiRes = await query(`
        SELECT 
            a.name, 
            a.display_name as "displayName", 
            a.path,
            json_agg(json_build_object(
                'id', a.id,
                'productId', a.product_id,
                'environment', p.environment,
                'qualityScore', a.quality_score,
                'originTeamId', a.origin_team_id
            )) as deployments
        FROM apis a
        JOIN products p ON a.product_id = p.id
        GROUP BY a.name, a.display_name, a.path
        ORDER BY a.display_name ASC
    `);

    return {
        products: productRes.rows,
        apis: apiRes.rows
    };
}

/**
 * Fetch the permission matrix for a specific product.
 */
export async function getPermissionMatrix(productId: string) {
    const res = await query(`
        SELECT pm.*, t.name as ad_group_name
        FROM permission_matrix pm
        LEFT JOIN teams t ON pm.ad_group_id = t.azure_ad_group_id
        WHERE pm.product_id = $1
        ORDER BY pm.environment, pm.role
    `, [productId]);

    // Process rows into a cleaner format if needed
    return res.rows.map(row => ({
        id: row.id,
        productId: row.product_id,
        adGroupId: row.ad_group_id,
        adGroupName: row.ad_group_name || 'External Group',
        environment: row.environment,
        role: row.role,
        updatedAt: row.updated_at
    }));
}

/**
 * Sync the permission matrix for a product.
 * Replaces old entries with new ones.
 */
export async function updatePermissionMatrix(productId: string, entries: { adGroupId: string, environment: string, role: string }[]) {
    // 1. Clear existing entries for this product
    await query('DELETE FROM permission_matrix WHERE product_id = $1', [productId]);

    // 2. Insert new entries
    const results = [];
    for (const entry of entries) {
        const res = await query(`
            INSERT INTO permission_matrix (product_id, ad_group_id, environment, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [productId, entry.adGroupId, entry.environment, entry.role]);
        results.push(res.rows[0]);
    }

    // 3. Trigger ARM Sync for each entry if needed
    // (In a real app, you might only sync 'Admin' or 'Contributor' groups)
    for (const entry of entries) {
        updateProductMetadata(productId, entry.adGroupId, entry.environment)
            .catch(err => console.error('[ProductsService] Matrix ARM Sync Failed Background:', err));
    }

    return results;
}
