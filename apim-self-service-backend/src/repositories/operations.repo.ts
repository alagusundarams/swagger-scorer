import { query } from '../services/core/db.js';

/**
 * OperationsRepository
 * 
 * Handles all database operations for API Operations.
 */
export class OperationsRepository {
    /**
     * Get all operations for an API
     */
    async getOperations(apiId: string) {
        return await query(`
            SELECT * FROM operations
            WHERE api_id = $1
               OR api_id = $1 || ':Global'
               OR api_id LIKE $1 || ':%:Global'
            ORDER BY url_template ASC, method ASC
        `, [apiId], 'GetOperations');
    }

    /**
     * Upsert (insert or update) an operation
     */
    async upsertOperation(op: any) {
        return await query(`
            INSERT INTO operations (
                api_id, method, path, display_name, description, url_template
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (api_id, method, path) 
            DO UPDATE SET 
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                url_template = EXCLUDED.url_template
            RETURNING *
        `, [op.apiId, op.method, op.path, op.displayName, op.description, op.urlTemplate], 'UpsertOperation');
    }
}
