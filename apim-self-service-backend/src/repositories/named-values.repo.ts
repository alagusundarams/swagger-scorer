import { query } from '../services/core/db.js';

/**
 * NamedValuesRepository
 * 
 * Handles all database operations for Named Values.
 * Supports shared resource model via product_named_values junction table.
 */
export class NamedValuesRepository {
    /**
     * Find a named value by system name and environment (duplicate check)
     */
    async findNamedValueByName(systemName: string, environment: string) {
        return await query(
            'SELECT * FROM named_values WHERE system_name = $1 AND environment = $2 LIMIT 1',
            [systemName, environment]
        );
    }

    /**
     * Get all named values for a product (includes junction table data)
     */
    async getNamedValues(productId: string) {
        return await query(`
            SELECT nv.*, 
                   CASE 
                       WHEN nv.scope_id IS NULL THEN 'Product Level'
                       ELSE a.display_name 
                   END as scope_name
            FROM named_values nv
            LEFT JOIN apis a ON nv.scope_id = a.id
            WHERE nv.product_id = $1
            ORDER BY nv.scope_id NULLS FIRST, nv.display_name ASC
        `, [productId]);
    }

    /**
     * Link a product to a named value (junction table entry)
     */
    async linkProductToNamedValue(productId: string, namedValueId: string, options: { isOwner: boolean, canModify: boolean }) {
        return await query(`
            INSERT INTO product_named_values (product_id, named_value_id, is_owner, can_modify)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (product_id, named_value_id) DO UPDATE
            SET is_owner = EXCLUDED.is_owner, can_modify = EXCLUDED.can_modify
            RETURNING *
        `, [productId, namedValueId, options.isOwner, options.canModify]);
    }

    /**
     * Unlink a product from a named value (remove junction table entry)
     */
    async unlinkProductFromNamedValue(productId: string, namedValueId: string) {
        return await query(
            'DELETE FROM product_named_values WHERE product_id = $1 AND named_value_id = $2',
            [productId, namedValueId]
        );
    }

    /**
     * Get junction table link between product and named value
     */
    async getProductNamedValueLink(productId: string, namedValueId: string) {
        return await query(
            'SELECT * FROM product_named_values WHERE product_id = $1 AND named_value_id = $2',
            [productId, namedValueId]
        );
    }

    /**
     * Get all products using a specific named value
     */
    async getNamedValueProducts(namedValueId: string) {
        return await query(`
            SELECT p.id, p.display_name, p.owner_team_id, t.name as team_name,
                   pnv.is_owner, pnv.can_modify
            FROM product_named_values pnv
            JOIN products p ON pnv.product_id = p.id
            LEFT JOIN teams t ON p.owner_team_id = t.id
            WHERE pnv.named_value_id = $1
        `, [namedValueId]);
    }

    /**
     * Check if a named value name already exists (collision detection)
     */
    async checkNamedValueCollision(value: string) {
        return await query('SELECT * FROM named_values WHERE value = $1', [value]);
    }

    /**
     * Get existing named value for a product by system name
     */
    async getExistingNamedValue(productId: string, systemName: string, scopeId?: string) {
        return await query(
            'SELECT * FROM named_values WHERE product_id = $1 AND system_name = $2 AND scope_id IS NOT DISTINCT FROM $3',
            [productId, systemName, scopeId || null]
        );
    }

    /**
     * Update a named value
     */
    async updateNamedValue(id: string, data: any) {
        return await query(
            'UPDATE named_values SET display_name = $1, value = $2 WHERE id = $3 RETURNING *',
            [data.displayName, data.value, id]
        );
    }

    /**
     * Create a new named value
     */
    async createNamedValue(productId: string, data: any) {
        return await query(
            'INSERT INTO named_values (product_id, system_name, display_name, value, scope_id, is_secret, environment) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [productId, data.systemName, data.displayName, data.value, data.scopeId || null, data.isSecret || false, data.environment]
        );
    }

    /**
     * Delete a named value
     */
    async deleteNamedValue(productId: string, valueId: string) {
        return await query(
            'DELETE FROM named_values WHERE product_id = $1 AND id = $2',
            [productId, valueId]
        );
    }
}
