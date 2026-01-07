import { FastifyReply, FastifyRequest } from 'fastify';
import { query } from '../services/core/db.js';

export class ValidationController {

    /**
     * Check if an API path already exists in a given environment
     */
    async validateApiPath(request: FastifyRequest, reply: FastifyReply) {
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error validating API path');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate API path'
            });
        }
    }

    /**
     * Check if a product name already exists in a given environment
     */
    async validateProductName(request: FastifyRequest, reply: FastifyReply) {
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error validating product name');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate product name'
            });
        }
    }

    /**
     * Check if a named value key already exists in a given environment
     */
    async validateNamedValueKey(request: FastifyRequest, reply: FastifyReply) {
        const { key, environment } = request.body as any;

        if (!key || !environment) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'key and environment are required'
            });
        }

        try {
            const result = await query(`
                SELECT system_name as key, environment, value
                FROM named_values
                WHERE system_name = $1
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error validating named value key');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate named value key'
            });
        }
    }

    /**
     * Check if a backend ID already exists in a given environment
     */
    async validateBackendId(request: FastifyRequest, reply: FastifyReply) {
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error validating backend ID');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate backend ID'
            });
        }
    }

    /**
     * Check if a subscription already exists for this product and team
     */
    async validateSubscription(request: FastifyRequest, reply: FastifyReply) {
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error validating subscription');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate subscription'
            });
        }
    }

    /**
     * Batch validation
     */
    async validateBatch(request: FastifyRequest, reply: FastifyReply) {
        const { validations } = request.body as any;

        if (!Array.isArray(validations)) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'validations must be an array'
            });
        }

        try {
            const results = [];

            // Reusing logic from internal checks, but we need simplified return values (no detailed conflicts usually needed for batch, but helpful)
            // For code reuse, I'll basically run minimal queries here or call "private" logic. 
            // Since the individual methods return FastifyReply, I cannot call them directly easily.
            // I should duplicate the logic or extract logic to private methods.
            // I'll extract logic to private helper functions.

            for (const validation of validations) {
                const { type, ...params } = validation;
                let result;
                switch (type) {
                    case 'api-path':
                        result = await this._checkApiPath(params);
                        break;
                    case 'product-name':
                        result = await this._checkProductName(params);
                        break;
                    case 'named-value-key':
                        result = await this._checkNamedValueKey(params);
                        break;
                    case 'backend-id':
                        result = await this._checkBackendId(params);
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
        } catch (error: any) {
            request.log.error({ err: error }, 'Error in batch validation');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to validate batch'
            });
        }
    }

    // INTERNAL HELPER METHODS for Batch
    private async _checkApiPath(params: any) {
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

    private async _checkProductName(params: any) {
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

    private async _checkNamedValueKey(params: any) {
        const { key, environment } = params;
        const result = await query(`
            SELECT COUNT(*) as count
            FROM named_values
            WHERE system_name = $1 AND environment = $2
        `, [key, environment]);
        const count = parseInt(result.rows[0].count);
        return {
            isValid: count === 0,
            isDuplicate: count > 0,
            message: count > 0 ? `Named value "${key}" already exists` : 'Key is available'
        };
    }

    private async _checkBackendId(params: any) {
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
}
