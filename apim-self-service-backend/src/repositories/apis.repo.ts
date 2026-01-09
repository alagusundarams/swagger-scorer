import { query } from '../services/core/db.js';

/**
 * ApisRepository
 * 
 * Handles all database operations for API resources.
 */
export class ApisRepository {
    /**
     * Get all APIs with their operations
     */
    async getAllApis() {
        return await query(`
            SELECT a.*, o.json_data as operations_json,
                   COALESCE(ar_api.client_id, ar_prod.client_id) as identity_client_id,
                   COALESCE(ar_api.display_name, ar_prod.display_name) as identity_display_name,
                   COALESCE(ar_api.app_id_uri, ar_prod.app_id_uri) as identity_app_id_uri,
                   a.gateway_url, a.service_url,
                   CASE 
                     WHEN ar_api.id IS NOT NULL THEN 'API'
                     WHEN ar_prod.id IS NOT NULL THEN 'PRODUCT'
                     ELSE NULL
                   END as identity_type
            FROM apis a
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN app_registrations ar_api ON ar_api.api_id = a.id
            LEFT JOIN app_registrations ar_prod ON ar_prod.product_id = p.id AND ar_prod.api_id IS NULL
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
        `, [], 'GetAllApis');
    }

    /**
     * Get all APIs with product names
     */
    async getAllApisDetailed() {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            ORDER BY a.display_name ASC
        `);
    }

    /**
     * Search APIs by name, path, or description
     */
    async searchApis(queryTerm: string) {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            WHERE a.display_name ILIKE $1 
               OR a.path ILIKE $1
               OR a.description ILIKE $1
            ORDER BY a.display_name ASC
            LIMIT 50
        `, [`%${queryTerm}%`], 'SearchApis');
    }

    /**
     * Get a single API by ID
     */
    async getApiById(id: string) {
        return await query(`
            SELECT a.*, p.display_name as product_display_name, o.json_data as operations_json,
                   COALESCE(ar_api.client_id, ar_prod.client_id) as identity_client_id,
                   COALESCE(ar_api.display_name, ar_prod.display_name) as identity_display_name,
                   COALESCE(ar_api.app_id_uri, ar_prod.app_id_uri) as identity_app_id_uri,
                   a.gateway_url, a.service_url,
                   CASE 
                     WHEN ar_api.id IS NOT NULL THEN 'API'
                     WHEN ar_prod.id IS NOT NULL THEN 'PRODUCT'
                     ELSE NULL
                   END as identity_type
            FROM apis a
            JOIN products p ON a.product_id = p.id
            LEFT JOIN app_registrations ar_api ON ar_api.api_id = a.id
            LEFT JOIN app_registrations ar_prod ON ar_prod.product_id = p.id AND ar_prod.api_id IS NULL
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
            WHERE a.id = $1
        `, [id], 'GetApiById');
    }

    /**
     * Get all APIs for a specific product
     */
    async getAllApisByProductId(productId: string) {
        return await query(`
            SELECT a.*, o.json_data as operations_json,
                   COALESCE(ar_api.client_id, ar_prod.client_id) as identity_client_id,
                   COALESCE(ar_api.display_name, ar_prod.display_name) as identity_display_name,
                   COALESCE(ar_api.app_id_uri, ar_prod.app_id_uri) as identity_app_id_uri,
                   a.gateway_url, a.service_url,
                   CASE 
                     WHEN ar_api.id IS NOT NULL THEN 'API'
                     WHEN ar_prod.id IS NOT NULL THEN 'PRODUCT'
                     ELSE NULL
                   END as identity_type
            FROM apis a
            LEFT JOIN app_registrations ar_api ON ar_api.api_id = a.id
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN app_registrations ar_prod ON ar_prod.product_id = p.id AND ar_prod.api_id IS NULL
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
            WHERE a.product_id = $1
               OR a.product_id = $1 || ':Global'
               OR a.product_id LIKE $1 || ':%:Global'
        `, [productId], 'GetAllApisByProductId');
    }

    /**
     * Get Git repo URL for an API (via its product)
     */
    async getRepoUrlForApi(apiId: string) {
        return await query(`
            SELECT p.git_repo_url 
            FROM products p
            JOIN apis a ON a.product_id = p.id
            WHERE a.id = $1
        `, [apiId], 'GetRepoUrlForApi');
    }

    async addApi(api: any) {
        return await query(`
            INSERT INTO apis (
                id, product_id, name, display_name, description, path, quality_score, origin_team_id, gateway_url, service_url, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        `, [
            api.id, api.productId, api.name, api.displayName, api.description, api.path,
            api.qualityScore || 0, api.originTeamId, api.gatewayUrl, api.serviceUrl
        ], 'AddApi');
    }

    /**
     * Update API metadata (URLs)
     */
    async updateApiMetadata(id: string, gatewayUrl?: string, serviceUrl?: string) {
        return await query(`
            UPDATE apis SET 
                gateway_url = COALESCE($2, gateway_url),
                service_url = COALESCE($3, service_url),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, gatewayUrl, serviceUrl], 'UpdateApiMetadata');
    }

    /**
     * Remove an API from a product
     */
    async removeApi(apiId: string, productId: string) {
        return await query(
            'DELETE FROM apis WHERE id = $1 AND product_id = $2',
            [apiId, productId], 'RemoveApi'
        );
    }

    /**
     * Check if an API belongs to a specific product
     */
    async checkApiBelongsToProduct(apiId: string, productId: string) {
        return await query('SELECT EXISTS(SELECT 1 FROM apis WHERE id = $1 AND product_id = $2)', [apiId, productId], 'CheckApiBelongsToProduct');
    }
    /**
     * Get global APIs (for admin/governance)
     */
    async getGlobalApis() {
        return await query(`
            SELECT 
                a.name, 
                a.display_name as "displayName", 
                a.path,
                json_agg(json_build_object(
                    'id', a.id,
                    'productId', a.product_id,
                    'environment', p.environment,
                    'qualityScore', a.quality_score,
                    'originTeamId', a.origin_team_id,
                    'gatewayUrl', a.gateway_url,
                    'serviceUrl', a.service_url,
                    'operations', o.json_data
                )) as deployments
            FROM apis a
            JOIN products p ON a.product_id = p.id
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
            GROUP BY a.name, a.display_name, a.path
            ORDER BY a.display_name ASC
        `, [], 'GetGlobalApis');
    }
}
