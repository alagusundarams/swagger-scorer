/**
 * @fileoverview Backends Service
 * 
 * Manages backend configurations (governance_backends) per environment
 */

import { query } from './db.js';

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

/**
 * Get all backends for an environment
 */
export async function getBackends(environment: string): Promise<Backend[]> {
    const result = await query(`
        SELECT id, environment, url, description, title, protocol, product_id, api_id, scope, created_at, updated_at
        FROM governance_backends
        WHERE environment = $1
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
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Get a specific backend
 */
export async function getBackend(id: string, environment: string): Promise<Backend | null> {
    const result = await query(`
        SELECT id, environment, url, description, title, protocol, created_at, updated_at
        FROM governance_backends
        WHERE id = $1 AND environment = $2
    `, [id, environment]);

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
export async function deleteBackend(id: string, environment: string): Promise<boolean> {
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
