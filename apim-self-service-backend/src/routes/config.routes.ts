/**
 * @fileoverview Configuration Routes - DEPRECATED/STUBBED
 * 
 * This file references an outdated API pattern that doesn't exist in the refactored codebase.
 * The functions it tries to import (getNamedValues, getBackends, etc.) are not part of
 * the new product-centric NamedValuesService or BackendsService.
 * 
 * TODO: Create a new ConfigService that provides environment-based configuration management
 * or remove these routes entirely if they're not being used.
 */

import { FastifyPluginAsync } from 'fastify';

const configRoutes: FastifyPluginAsync = async (fastify) => {
    // Stub route to prevent server startup errors
    fastify.get('/config/stub', async (_request, reply) => {
        return reply.code(501).send({
            error: 'Not Implemented',
            message: 'Config routes are being refactored. Use product-based API endpoints from /api/v1/products/:id instead.'
        });
    });
};

export default configRoutes;
