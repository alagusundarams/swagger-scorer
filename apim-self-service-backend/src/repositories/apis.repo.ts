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
            SELECT a.*, o.json_data as operations_json
            FROM apis a
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
        `);
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
        `, [`%${queryTerm}%`]);
    }

    /**
     * Get a single API by ID
     */
    async getApiById(id: string) {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            WHERE a.id = $1
        `, [id]);
    }

    /**
     * Get all APIs for a specific product
     */
    async getAllApisByProductId(productId: string) {
        return await query('SELECT * FROM apis WHERE product_id = $1', [productId]);
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
        `, [apiId]);
    }

    /**
     * Create a new API
     */
    async addApi(api: any) {
        return await query(`
            INSERT INTO apis (
                id, product_id, name, display_name, description, path, quality_score, origin_team_id, git_repo_url, git_file_path, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        `, [
            api.id, api.productId, api.name, api.displayName, api.description, api.path,
            api.qualityScore || 0, api.originTeamId, api.gitRepoUrl, api.gitFilePath
        ]);
    }

    /**
     * Remove an API from a product
     */
    async removeApi(apiId: string, productId: string) {
        return await query(
            'DELETE FROM apis WHERE id = $1 AND product_id = $2',
            [apiId, productId]
        );
    }

    /**
     * Check if an API belongs to a specific product
     */
    async checkApiBelongsToProduct(apiId: string, productId: string) {
        return await query('SELECT EXISTS(SELECT 1 FROM apis WHERE id = $1 AND product_id = $2)', [apiId, productId]);
    }
}
