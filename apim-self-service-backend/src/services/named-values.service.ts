/**
 * @fileoverview Named Values Service
 * 
 * Manages Named Values (access_control_lists) per environment
 */

import { query } from './db.js';

export interface NamedValue {
    key: string;
    environment: string;
    value: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Get all named values for an environment
 */
export async function getNamedValues(environment: string): Promise<NamedValue[]> {
    const result = await query(`
        SELECT key, environment, value, created_at, updated_at
        FROM access_control_lists
        WHERE environment = $1
        ORDER BY key ASC
    `, [environment]);

    return result.rows.map(row => ({
        key: row.key,
        environment: row.environment,
        value: row.value,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Get a specific named value
 */
export async function getNamedValue(key: string, environment: string): Promise<NamedValue | null> {
    const result = await query(`
        SELECT key, environment, value, created_at, updated_at
        FROM access_control_lists
        WHERE key = $1 AND environment = $2
    `, [key, environment]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        key: row.key,
        environment: row.environment,
        value: row.value,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Create or update a named value
 */
export async function upsertNamedValue(params: {
    key: string;
    environment: string;
    value: string;
}): Promise<NamedValue> {
    const result = await query(`
        INSERT INTO access_control_lists (key, environment, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (key, environment)
        DO UPDATE SET value = $3, updated_at = NOW()
        RETURNING key, environment, value, created_at, updated_at
    `, [params.key, params.environment, params.value]);

    const row = result.rows[0];
    return {
        key: row.key,
        environment: row.environment,
        value: row.value,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Delete a named value
 */
export async function deleteNamedValue(key: string, environment: string): Promise<boolean> {
    const result = await query(`
        DELETE FROM access_control_lists
        WHERE key = $1 AND environment = $2
    `, [key, environment]);

    return (result.rowCount || 0) > 0;
}
