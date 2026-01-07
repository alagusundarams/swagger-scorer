import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { OrphansController } from '../controllers/OrphansController.js';

const controller = new OrphansController();

/**
 * Orphans / Configuration Routes
 * 
 * Used by Admin UI for "Adoption" workflows.
 * path prefix: /api/v1/config
 */
export async function orphansRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    // Named Values
    fastify.get('/named-values/orphans', controller.getOrphanNamedValues.bind(controller));
    fastify.post('/named-values/adopt', controller.adoptNamedValue.bind(controller));

    // Backends
    fastify.get('/backends/orphans', controller.getOrphanBackends.bind(controller));
    fastify.post('/backends/adopt', controller.adoptBackend.bind(controller));

}
