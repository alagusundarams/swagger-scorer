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
    deleteNamedValue,
    getOrphanNamedValues,
    assignNamedValue
} from '../services/named-values.service.js';

import {
    getBackends,
    getBackend,
    upsertBackend,
    deleteBackend,
    getOrphanBackends,
    assignBackend
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
    fastify.get('/config/named-values/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const value = await getNamedValue(id, environment);

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
        const { systemName, environment, value, displayName, isSecret } = request.body as any;

        if (!systemName || !environment || !value) {
            return reply.code(400).send({ error: 'systemName, environment, and value are required' });
        }

        try {
            const namedValue = await upsertNamedValue({ systemName, environment, value, displayName, isSecret });
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
    fastify.delete('/config/named-values/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { environment } = request.query as { environment?: string };

        if (!environment) {
            return reply.code(400).send({ error: 'environment query parameter required' });
        }

        try {
            const deleted = await deleteNamedValue(id, environment);

            if (!deleted) {
                return reply.code(404).send({ error: 'Named value not found' });
            }

            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to delete named value');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/config/named-values/orphans?environment=DEV
     */
    fastify.get('/config/named-values/orphans', async (request, reply) => {
        const { environment } = request.query as { environment?: string };
        if (!environment) return reply.code(400).send({ error: 'environment required' });

        try {
            const orphans = await getOrphanNamedValues(environment);
            return { success: true, count: orphans.length, orphans };
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/config/named-values/adopt
     */
    fastify.post('/config/named-values/adopt', async (request, reply) => {
        const { id, environment, productId, scopeId, scope } = request.body as any;
        if (!id || !environment || !scope) return reply.code(400).send({ error: 'Missing required fields' });

        try {
            const result = await assignNamedValue(id, environment, { productId, scopeId, scope });
            return { success: true, value: result };
        } catch (error: any) {
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

    /**
     * GET /api/v1/config/backends/orphans?environment=DEV
     */
    fastify.get('/config/backends/orphans', async (request, reply) => {
        const { environment } = request.query as { environment?: string };
        if (!environment) return reply.code(400).send({ error: 'environment required' });

        try {
            const orphans = await getOrphanBackends(environment);
            return { success: true, count: orphans.length, orphans };
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/config/backends/adopt
     */
    fastify.post('/config/backends/adopt', async (request, reply) => {
        const { id, environment, productId, apiId, scope } = request.body as any;
        if (!id || !environment || !scope) return reply.code(400).send({ error: 'Missing required fields' });

        try {
            const result = await assignBackend(id, environment, { productId, apiId, scope });
            return { success: true, backend: result };
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default configRoutes;
