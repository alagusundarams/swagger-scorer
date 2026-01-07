/**
 * @fileoverview Backends Service
 * 
 * Manages backend configurations (governance_backends) per environment
 */

import { query } from '../core/db.js';

export interface Backend {
    id: string;
    environment: string;
    url: string;
    description?: string;
    title?: string;
    protocol?: string;
    productId?: string;
    apiId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserContext {
    role: string;
    groups: string[];
}

/**
 * Get all backends for an environment, filtered by permissions
 */
export async function getBackends(environment: string, userContext: UserContext): Promise<Backend[]> {
    const isAdmin = userContext.role === 'admin';
    const accessFilter = isAdmin ? '' : `
        AND (
            gb.product_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM permission_matrix pm 
                WHERE pm.product_id = gb.product_id 
                AND pm.ad_group_id = ANY($2::text[])
                AND pm.environment = $1
            )
            OR EXISTS (
                SELECT 1 FROM products p
                WHERE p.id = gb.product_id
                AND p.owner_team_id IN (
                    SELECT id FROM teams WHERE azure_ad_group_id = ANY($2::text[])
                )
            )
        )
    `;

    const params = isAdmin ? [environment] : [environment, userContext.groups];

    const result = await query(`
        SELECT gb.id, gb.environment, gb.url, gb.description, gb.title, gb.protocol, gb.product_id, gb.api_id, gb.scope, gb.created_at, gb.updated_at
        FROM governance_backends gb
        WHERE gb.environment = $1
        ${accessFilter}
        ORDER BY gb.id ASC
    `, params);

    return result.rows.map(row => ({
        id: row.id,
        environment: row.environment,
        url: row.url,
        description: row.description,
        title: row.title,
        protocol: row.protocol,
        productId: row.product_id,
        apiId: row.api_id,
        scope: row.scope,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Get a specific backend with permission check
 */
export async function getBackend(id: string, environment: string, userContext: UserContext): Promise<Backend | null> {
    const isAdmin = userContext.role === 'admin';
    const accessFilter = isAdmin ? '' : `
        AND (
            gb.product_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM permission_matrix pm 
                WHERE pm.product_id = gb.product_id 
                AND pm.ad_group_id = ANY($3::text[])
                AND pm.environment = $2
            )
        )
    `;

    const params = isAdmin ? [id, environment] : [id, environment, userContext.groups];

    const result = await query(`
        SELECT gb.*
        FROM governance_backends gb
        WHERE gb.id = $1 AND gb.environment = $2
        ${accessFilter}
    `, params);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        environment: row.environment,
        url: row.url,
        description: row.description,
        title: row.title,
        protocol: row.protocol,
        productId: row.product_id,
        apiId: row.api_id,
        scope: row.scope,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Create or update a backend
 */
export async function upsertBackend(params: {
    id: string;
    environment: string;
    url: string;
    description?: string;
    title?: string;
    protocol?: string;
}): Promise<Backend> {
    const result = await query(`
        INSERT INTO governance_backends (id, environment, url, description, title, protocol)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id, environment)
        DO UPDATE SET 
            url = $3,
            description = $4,
            title = $5,
            protocol = $6,
            updated_at = NOW()
        RETURNING id, environment, url, description, title, protocol, created_at, updated_at
    `, [params.id, params.environment, params.url, params.description, params.title, params.protocol || 'https']);

    const row = result.rows[0];
    return {
        id: row.id,
        environment: row.environment,
        url: row.url,
        description: row.description,
        title: row.title,
        protocol: row.protocol,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Delete a backend
 */
export async function deleteBackend(id: string, environment: string, userContext: UserContext): Promise<boolean> {
    if (userContext.role !== 'admin') {
        throw new Error('Forbidden: Only administrators can delete backends');
    }

    const result = await query(`
        DELETE FROM governance_backends
        WHERE id = $1 AND environment = $2
    `, [id, environment]);

    return (result.rowCount || 0) > 0;
}

/**
 * Get all orphaned backends (those without a linked product/api and not GLOBAL)
 */
export async function getOrphanBackends(environment: string): Promise<Backend[]> {
    const result = await query(`
        SELECT id, environment, url, description, title, protocol, product_id, api_id, scope, updated_at
        FROM governance_backends
        WHERE environment = $1
        AND (scope IS NULL OR (scope != 'GLOBAL' AND product_id IS NULL))
        ORDER BY id ASC
    `, [environment]);

    return result.rows.map(row => ({
        id: row.id,
        environment: row.environment,
        url: row.url,
        description: row.description,
        title: row.title,
        protocol: row.protocol,
        productId: row.product_id,
        apiId: row.api_id,
        scope: row.scope,
        updatedAt: row.updated_at
    }));
}

/**
 * Assign a backend to a product/api
 */
export async function assignBackend(id: string, environment: string, data: { productId?: string, apiId?: string, scope: 'PRODUCT' | 'API' | 'GLOBAL' }) {
    const result = await query(`
        UPDATE governance_backends
        SET product_id = $1, api_id = $2, scope = $3, updated_at = NOW()
        WHERE id = $4 AND environment = $5
        RETURNING *
    `, [data.productId || null, data.apiId || null, data.scope, id, environment]);

    return result.rows[0];
}
