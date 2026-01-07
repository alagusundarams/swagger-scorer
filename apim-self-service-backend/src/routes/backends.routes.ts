/**
 * @fileoverview Backends Routes
 * 
 * Fastify routes for Governance Backends.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
// Controller retrieved from container
export async function backendsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
    const { backendsController } = fastify.container;


    // GET /api/v1/backends
    fastify.get('/backends', backendsController.getBackends);

    // GET /api/v1/backends/:id
    fastify.get('/backends/:id', backendsController.getBackend);

    // POST /api/v1/backends (Upsert)
    fastify.post('/backends', backendsController.upsertBackend);

    // DELETE /api/v1/backends/:id
    fastify.delete('/backends/:id', backendsController.deleteBackend);
}
