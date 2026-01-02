/**
 * @fileoverview Configuration Routes - Named Values & Backends
 * 
 * Manages configuration for Named Values and Backend services
 */

import { FastifyPluginAsync } from 'fastify';
import {
    getNamedValues,
    getNamedValue,
    upsertNamedValue,
    deleteNamedValue
} from '../services/named-values.service.js';
import {
    getBackends,
    getBackend,
    upsertBackend,
    deleteBackend
} from '../services/backends.service.js';
import { getAppConfig } from '../config/loader.js';

const configRoutes: FastifyPluginAsync = async (fastify) => {
    // ==========================================
    // ENVIRONMENTS ROUTES
    // ==========================================

    /**
     * GET /api/v1/environments
     * Get list of available environment names
     */
    fastify.get('/environments', async (_request, _reply) => {
        const config = getAppConfig();
        // Return lowercase names to match frontend expectations
        return config.azure.environments.map(e => e.name.toLowerCase());
    });

    // ==========================================
    // NAMED VALUES ROUTES
    // ==========================================

    /**
     * GET /api/v1/config/named-values?environment=DEV
     * Get all named values for an environment
     */
    fastify.get('/config/named-values', async (request, reply) => {
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const values = await getNamedValues(environment);
            return { success: true, count: values.length, values };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get named values');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/config/named-values/:key?environment=DEV
     * Get a specific named value
     */
    fastify.get('/config/named-values/:key', async (request, reply) => {
        const { key } = request.params as { key: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const value = await getNamedValue(key, environment);

            if (!value) {
                return reply.code(404).send({ error: 'Named value not found' });
            }

            return { success: true, value };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get named value');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/config/named-values
     * Create or update a named value
     */
    fastify.post('/config/named-values', async (request, reply) => {
        const { key, environment, value } = request.body as {
            key: string;
            environment: string;
            value: string;
        };

        if (!key || !environment || !value) {
            return reply.code(400).send({ error: 'key, environment, and value are required' });
        }

        try {
            const namedValue = await upsertNamedValue({ key, environment, value });
            return { success: true, value: namedValue };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to upsert named value');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * DELETE /api/v1/config/named-values/:key?environment=DEV
     * Delete a named value
     */
    fastify.delete('/config/named-values/:key', async (request, reply) => {
        const { key } = request.params as { key: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const deleted = await deleteNamedValue(key, environment);

            if (!deleted) {
                return reply.code(404).send({ error: 'Named value not found' });
            }

            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to delete named value');
            return reply.code(500).send({ error: error.message });
        }
    });

    // ==========================================
    // BACKENDS ROUTES
    // ==========================================

    /**
     * GET /api/v1/config/backends?environment=DEV
     * Get all backends for an environment
     */
    fastify.get('/config/backends', async (request, reply) => {
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const backends = await getBackends(environment);
            return { success: true, count: backends.length, backends };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get backends');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/config/backends/:id?environment=DEV
     * Get a specific backend
     */
    fastify.get('/config/backends/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const backend = await getBackend(id, environment);

            if (!backend) {
                return reply.code(404).send({ error: 'Backend not found' });
            }

            return { success: true, backend };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get backend');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/config/backends
     * Create or update a backend
     */
    fastify.post('/config/backends', async (request, reply) => {
        const { id, environment, url, description, title, protocol } = request.body as {
            id: string;
            environment: string;
            url: string;
            description?: string;
            title?: string;
            protocol?: string;
        };

        if (!id || !environment || !url) {
            return reply.code(400).send({ error: 'id, environment, and url are required' });
        }

        try {
            const backend = await upsertBackend({ id, environment, url, description, title, protocol });
            return { success: true, backend };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to upsert backend');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * DELETE /api/v1/config/backends/:id?environment=DEV
     * Delete a backend
     */
    fastify.delete('/config/backends/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const deleted = await deleteBackend(id, environment);

            if (!deleted) {
                return reply.code(404).send({ error: 'Backend not found' });
            }

            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to delete backend');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default configRoutes;
