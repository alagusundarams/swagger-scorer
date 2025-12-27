/**
 * @fileoverview Validation Routes
 * 
 * Real-time validation endpoints for duplicate detection during onboarding.
 * Checks for duplicates per environment to prevent conflicts.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { query } from '../services/db.js';

export async function validationRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    /**
     * POST /api/v1/validate/api-path
     * Check if an API path already exists in a given environment
     */
    fastify.post('/api-path', async (request, reply) => {
        const { path, environment, excludeApiId } = request.body as any;

        if (!path || !environment) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'path and environment are required'
            });
        }

        try {
            const result = await query(`
                SELECT a.id, a.display_name, a.path, p.display_name as product_name, p.id as product_id
                FROM apis a
                JOIN products p ON a.product_id = p.id
                WHERE a.path = $1
                AND p.environment = $2
                AND a.id != $3
            `, [path, environment, excludeApiId || '']);

            const conflicts = result.rows;

            return {
                isValid: conflicts.length === 0,
                isDuplicate: conflicts.length > 0,
                conflicts: conflicts.map(row => ({
                    apiId: row.id,
                    apiName: row.display_name,
                    apiPath: row.path,
                    productId: row.product_id,
                    productName: row.product_name
                })),
                message: conflicts.length > 0
                    ? `Path "${path}" already exists in ${environment}`
                    : `Path "${path}" is available in ${environment}`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error validating API path');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate API path'
            });
        }
    });

    /**
     * POST /api/v1/validate/product-name
     * Check if a product name already exists in a given environment
     */
    fastify.post('/product-name', async (request, reply) => {
        const { name, environment, excludeProductId } = request.body as any;

        if (!name || !environment) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'name and environment are required'
            });
        }

        try {
            const result = await query(`
                SELECT id, name, display_name, environment
                FROM products
                WHERE name = $1
                AND environment = $2
                AND id != $3
            `, [name, environment, excludeProductId || '']);

            const conflicts = result.rows;

            return {
                isValid: conflicts.length === 0,
                isDuplicate: conflicts.length > 0,
                conflicts: conflicts.map(row => ({
                    productId: row.id,
                    productName: row.name,
                    displayName: row.display_name,
                    environment: row.environment
                })),
                message: conflicts.length > 0
                    ? `Product "${name}" already exists in ${environment}`
                    : `Product name "${name}" is available in ${environment}`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error validating product name');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate product name'
            });
        }
    });

    /**
     * POST /api/v1/validate/named-value-key
     * Check if a named value key already exists in a given environment
     */
    fastify.post('/named-value-key', async (request, reply) => {
        const { key, environment } = request.body as any;

        if (!key || !environment) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'key and environment are required'
            });
        }

        try {
            const result = await query(`
                SELECT key, environment, value
                FROM access_control_lists
                WHERE key = $1
                AND environment = $2
            `, [key, environment]);

            const conflicts = result.rows;

            return {
                isValid: conflicts.length === 0,
                isDuplicate: conflicts.length > 0,
                conflicts: conflicts.map(row => ({
                    key: row.key,
                    environment: row.environment,
                    value: row.value
                })),
                message: conflicts.length > 0
                    ? `Named value "${key}" already exists in ${environment}`
                    : `Named value key "${key}" is available in ${environment}`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error validating named value key');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate named value key'
            });
        }
    });

    /**
     * POST /api/v1/validate/backend-id
     * Check if a backend ID already exists in a given environment
     */
    fastify.post('/backend-id', async (request, reply) => {
        const { backendId, environment } = request.body as any;

        if (!backendId || !environment) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'backendId and environment are required'
            });
        }

        try {
            const result = await query(`
                SELECT id, environment, url, title, description
                FROM governance_backends
                WHERE id = $1
                AND environment = $2
            `, [backendId, environment]);

            const conflicts = result.rows;

            return {
                isValid: conflicts.length === 0,
                isDuplicate: conflicts.length > 0,
                conflicts: conflicts.map(row => ({
                    backendId: row.id,
                    environment: row.environment,
                    url: row.url,
                    title: row.title,
                    description: row.description
                })),
                message: conflicts.length > 0
                    ? `Backend "${backendId}" already exists in ${environment}`
                    : `Backend ID "${backendId}" is available in ${environment}`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error validating backend ID');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate backend ID'
            });
        }
    });

    /**
     * POST /api/v1/validate/subscription-name
     * Check if a subscription name pattern already exists
     * Note: Subscriptions don't have a name field by default, but we can check uniqueness by product+team combo
     */
    fastify.post('/subscription', async (request, reply) => {
        const { productId, teamId, excludeSubscriptionId } = request.body as any;

        if (!productId || !teamId) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'productId and teamId are required'
            });
        }

        try {
            const result = await query(`
                SELECT s.id, s.product_id, s.subscriber_team_id, s.state,
                       p.display_name as product_name,
                       t.display_name as team_name
                FROM subscriptions s
                JOIN products p ON s.product_id = p.id
                JOIN teams t ON s.subscriber_team_id = t.id
                WHERE s.product_id = $1
                AND s.subscriber_team_id = $2
                AND s.id != $3
            `, [productId, teamId, excludeSubscriptionId || '']);

            const conflicts = result.rows;

            return {
                isValid: conflicts.length === 0,
                isDuplicate: conflicts.length > 0,
                conflicts: conflicts.map(row => ({
                    subscriptionId: row.id,
                    productName: row.product_name,
                    teamName: row.team_name,
                    state: row.state
                })),
                message: conflicts.length > 0
                    ? `Subscription already exists for this product and team`
                    : `No existing subscription found`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error validating subscription');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate subscription'
            });
        }
    });

    /**
     * POST /api/v1/validate/batch
     * Validate multiple items at once (for complex onboarding forms)
     */
    fastify.post('/batch', async (request, reply) => {
        const { validations } = request.body as any;

        if (!Array.isArray(validations)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'validations must be an array'
            });
        }

        try {
            const results = [];

            for (const validation of validations) {
                const { type, ...params } = validation;

                let result;
                switch (type) {
                    case 'api-path':
                        result = await validateApiPath(params);
                        break;
                    case 'product-name':
                        result = await validateProductName(params);
                        break;
                    case 'named-value-key':
                        result = await validateNamedValueKey(params);
                        break;
                    case 'backend-id':
                        result = await validateBackendId(params);
                        break;
                    default:
                        result = {
                            type,
                            isValid: false,
                            message: `Unknown validation type: ${type}`
                        };
                }

                results.push({ type, ...result });
            }

            const allValid = results.every(r => r.isValid);

            return {
                isValid: allValid,
                results
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error in batch validation');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate batch'
            });
        }
    });
}

// Helper functions for batch validation
async function validateApiPath(params: any) {
    const { path, environment, excludeApiId } = params;
    const result = await query(`
        SELECT COUNT(*) as count
        FROM apis a
        JOIN products p ON a.product_id = p.id
        WHERE a.path = $1 AND p.environment = $2 AND a.id != $3
    `, [path, environment, excludeApiId || '']);

    const count = parseInt(result.rows[0].count);
    return {
        isValid: count === 0,
        isDuplicate: count > 0,
        message: count > 0 ? `Path "${path}" already exists` : 'Path is available'
    };
}

async function validateProductName(params: any) {
    const { name, environment, excludeProductId } = params;
    const result = await query(`
        SELECT COUNT(*) as count
        FROM products
        WHERE name = $1 AND environment = $2 AND id != $3
    `, [name, environment, excludeProductId || '']);

    const count = parseInt(result.rows[0].count);
    return {
        isValid: count === 0,
        isDuplicate: count > 0,
        message: count > 0 ? `Product "${name}" already exists` : 'Product name is available'
    };
}

async function validateNamedValueKey(params: any) {
    const { key, environment } = params;
    const result = await query(`
        SELECT COUNT(*) as count
        FROM access_control_lists
        WHERE key = $1 AND environment = $2
    `, [key, environment]);

    const count = parseInt(result.rows[0].count);
    return {
        isValid: count === 0,
        isDuplicate: count > 0,
        message: count > 0 ? `Named value "${key}" already exists` : 'Key is available'
    };
}

async function validateBackendId(params: any) {
    const { backendId, environment } = params;
    const result = await query(`
        SELECT COUNT(*) as count
        FROM governance_backends
        WHERE id = $1 AND environment = $2
    `, [backendId, environment]);

    const count = parseInt(result.rows[0].count);
    return {
        isValid: count === 0,
        isDuplicate: count > 0,
        message: count > 0 ? `Backend "${backendId}" already exists` : 'Backend ID is available'
    };
}
