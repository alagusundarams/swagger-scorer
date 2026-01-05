/**
 * @fileoverview Named Values Service
 * 
 * Manages Named Values (named_values) per environment
 */

import { query } from './db.js';

export interface NamedValue {
    id: string;
    systemName: string;
    displayName?: string;
    environment: string;
    value: string;
    isSecret?: boolean;
    productId?: string;
    scopeId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Get all named values for an environment
 */
export async function getNamedValues(environment: string): Promise<NamedValue[]> {
    const result = await query(`
        SELECT id, system_name, display_name, environment, value, is_secret, scope, product_id, scope_id, created_at, updated_at
        FROM named_values
        WHERE environment = $1
        ORDER BY system_name ASC
    `, [environment]);

    return result.rows.map(row => ({
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        value: row.value,
        isSecret: row.is_secret,
        scope: row.scope,
        productId: row.product_id,
        scopeId: row.scope_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Get a specific named value
 */
export async function getNamedValue(id: string, environment: string): Promise<NamedValue | null> {
    const result = await query(`
        SELECT *
        FROM named_values
        WHERE id = $1 AND environment = $2
    `, [id, environment]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        value: row.value,
        isSecret: row.is_secret,
        scope: row.scope,
        productId: row.product_id,
        scopeId: row.scope_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Create or update a named value
 */
export async function upsertNamedValue(params: {
    systemName: string;
    environment: string;
    value: string;
    displayName?: string;
    isSecret?: boolean;
}): Promise<NamedValue> {
    const id = `${params.environment}-${params.systemName}`;
    const result = await query(`
        INSERT INTO named_values (id, system_name, display_name, environment, value, is_secret, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (environment, system_name)
        DO UPDATE SET 
            value = EXCLUDED.value, 
            display_name = EXCLUDED.display_name, 
            is_secret = EXCLUDED.is_secret, 
            updated_at = NOW()
        RETURNING *
    `, [id, params.systemName, params.displayName || params.systemName, params.environment, params.value, params.isSecret || false]);

    const row = result.rows[0];
    return {
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        value: row.value,
        isSecret: row.is_secret,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Delete a named value
 */
export async function deleteNamedValue(id: string, environment: string): Promise<boolean> {
    const result = await query(`
        DELETE FROM named_values
        WHERE id = $1 AND environment = $2
    `, [id, environment]);

    return (result.rowCount || 0) > 0;
}

/**
 * Get all orphaned named values
 */
export async function getOrphanNamedValues(environment: string): Promise<NamedValue[]> {
    const result = await query(`
        SELECT id, system_name, display_name, environment, value, scope, product_id, scope_id, updated_at
        FROM named_values
        WHERE environment = $1
        AND (scope IS NULL OR (scope != 'GLOBAL' AND product_id IS NULL))
        ORDER BY system_name ASC
    `, [environment]);

    return result.rows.map(row => ({
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        value: row.value,
        scope: row.scope,
        productId: row.product_id,
        scopeId: row.scope_id,
        updatedAt: row.updated_at
    }));
}

/**
 * Assign a named value to a product/api
 */
export async function assignNamedValue(id: string, environment: string, data: { productId?: string, scopeId?: string, scope: 'PRODUCT' | 'API' | 'GLOBAL' }) {
    const result = await query(`
        UPDATE named_values
        SET product_id = $1, scope_id = $2, scope = $3, updated_at = NOW()
        WHERE id = $4 AND environment = $5
        RETURNING *
    `, [data.productId || null, data.scopeId || null, data.scope, id, environment]);

    return result.rows[0];
}
