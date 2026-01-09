import { query } from '../services/core/db.js';

/**
 * BackendsRepository
 * 
 * Handles all database operations for Backend resources.
 */
export class BackendsRepository {
    /**
     * Find a backend by URL and environment (duplicate/collision check)
     */
    async findBackendByUrl(url: string, environment: string) {
        return await query(
            'SELECT * FROM governance_backends WHERE url = $1 AND environment = $2 LIMIT 1',
            [url, environment], 'FindBackendByUrl'
        );
    }

    /**
     * Get all APIs using a specific backend
     */
    async getApisUsingBackend(backendId: string, environment: string) {
        return await query(`
            SELECT a.id, a.display_name, a.product_id, p.display_name as product_name
            FROM api_backends ab
            JOIN apis a ON ab.api_id = a.id
            JOIN products p ON a.product_id = p.id
            WHERE ab.backend_id = $1 AND ab.environment = $2
        `, [backendId, environment], 'GetApisUsingBackend');
    }
}
