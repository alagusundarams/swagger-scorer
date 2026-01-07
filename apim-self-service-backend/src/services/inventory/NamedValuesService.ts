/**
 * @fileoverview Named Values Service
 * 
 * Manages Named Values (named_values) per environment
 * Aligned with current schema and AD-Group-based RBAC.
 */

import { query } from '../core/db.js';

export interface NamedValue {
    id: string;
    systemName: string;
    displayName?: string;
    environment: string;
    region: string;
    value: string;
    isSecret?: boolean;
    productId?: string;
    scopeId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserContext {
    role: string;
    groups: string[];
}

/**
 * Get all named values for an environment, filtered by permissions
 */
export async function getNamedValues(environment: string, userContext: UserContext): Promise<NamedValue[]> {
    const isAdmin = userContext.role === 'admin';

    // RBAC: If not admin, only show values linked to products the user has access to
    // or global values (scoped for all)
    const accessFilter = isAdmin ? '' : `
        AND (
            nv.product_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM permission_matrix pm 
                WHERE pm.product_id = nv.product_id 
                AND pm.ad_group_id = ANY($2::text[])
                AND pm.environment = $1
            )
            OR EXISTS (
                SELECT 1 FROM products p
                WHERE p.id = nv.product_id
                AND p.owner_team_id IN (
                    SELECT id FROM teams WHERE azure_ad_group_id = ANY($2::text[])
                )
            )
        )
    `;

    const params = isAdmin ? [environment] : [environment, userContext.groups];

    const result = await query(`
        SELECT nv.id, nv.system_name, nv.display_name, nv.environment, nv.region, nv.value, nv.is_secret, nv.product_id, nv.scope_id, nv.created_at, nv.updated_at
        FROM named_values nv
        WHERE nv.environment = $1
        ${accessFilter}
        ORDER BY nv.system_name ASC
    `, params);

    return result.rows.map(row => ({
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        region: row.region,
        value: row.value,
        isSecret: row.is_secret,
        productId: row.product_id,
        scopeId: row.scope_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Get a specific named value with permission check
 */
export async function getNamedValue(id: string, environment: string, userContext: UserContext): Promise<NamedValue | null> {
    const isAdmin = userContext.role === 'admin';
    const accessFilter = isAdmin ? '' : `
        AND (
            nv.product_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM permission_matrix pm 
                WHERE pm.product_id = nv.product_id 
                AND pm.ad_group_id = ANY($3::text[])
                AND pm.environment = $2
            )
        )
    `;

    const params = isAdmin ? [id, environment] : [id, environment, userContext.groups];

    const result = await query(`
        SELECT nv.*
        FROM named_values nv
        WHERE nv.id = $1 AND nv.environment = $2
        ${accessFilter}
    `, params);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        region: row.region,
        value: row.value,
        isSecret: row.is_secret,
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
    region?: string;
    value: string;
    displayName?: string;
    isSecret?: boolean;
    productId?: string;
    scopeId?: string;
}): Promise<NamedValue> {
    const result = await query(`
        INSERT INTO named_values (
            product_id, scope_id, system_name, display_name, value, type, is_secret, environment, region, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (system_name, environment, product_id, scope_id)
        DO UPDATE SET 
            value = EXCLUDED.value, 
            display_name = EXCLUDED.display_name, 
            is_secret = EXCLUDED.is_secret, 
            updated_at = NOW()
        RETURNING *
    `, [
        params.productId || null,
        params.scopeId || null,
        params.systemName,
        params.displayName || params.systemName,
        params.value,
        'literal', // Default to literal for upsert
        params.isSecret || false,
        params.environment,
        params.region || 'Global'
    ]);

    const row = result.rows[0];
    return {
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        region: row.region,
        value: row.value,
        isSecret: row.is_secret,
        productId: row.product_id,
        scopeId: row.scope_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Delete a named value
 */
export async function deleteNamedValue(id: string, environment: string, userContext: UserContext): Promise<boolean> {
    // Only admins or owners should delete. Simplifying for now to admin-only or owner placeholder
    if (userContext.role !== 'admin') {
        throw new Error('Forbidden: Only administrators can delete named values');
    }

    const result = await query(`
        DELETE FROM named_values
        WHERE id = $1 AND environment = $2
    `, [id, environment]);

    return (result.rowCount || 0) > 0;
}

/**
 * Get all orphaned named values (Global - not linked to a product)
 */
export async function getOrphanNamedValues(environment: string): Promise<NamedValue[]> {
    const result = await query(`
        SELECT nv.id, nv.system_name, nv.display_name, nv.environment, nv.region, nv.value, nv.product_id, nv.scope_id, nv.updated_at
        FROM named_values nv
        WHERE nv.environment = $1
        AND nv.product_id IS NULL
        ORDER BY nv.system_name ASC
    `, [environment]);

    return result.rows.map(row => ({
        id: row.id,
        systemName: row.system_name,
        displayName: row.display_name,
        environment: row.environment,
        region: row.region,
        value: row.value,
        productId: row.product_id,
        scopeId: row.scope_id,
        updatedAt: row.updated_at
    }));
}

/**
 * Assign a named value to a product/api
 */
export async function assignNamedValue(id: string, environment: string, data: { productId?: string, scopeId?: string }) {
    const result = await query(`
        UPDATE named_values
        SET product_id = $1, scope_id = $2, updated_at = NOW()
        WHERE id = $3 AND environment = $4
        RETURNING *
    `, [data.productId || null, data.scopeId || null, id, environment]);

    return result.rows[0];
}
