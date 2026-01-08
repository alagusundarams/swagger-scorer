import { FastifyInstance, FastifyPluginOptions } from 'fastify';

/**
 * Orphans / Configuration Routes
 * 
 * Used by Admin UI for "Adoption" workflows.
 * path prefix: /api/v1/admin/orphans
 */
export async function orphansRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
    const { orphansController } = fastify.container;

    // Named Values
    fastify.get('/named-values', orphansController.getOrphanNamedValues.bind(orphansController));
    fastify.post('/named-values/adopt', orphansController.adoptNamedValue.bind(orphansController));

    // App Registrations
    fastify.get('/app-registrations', orphansController.getOrphanAppRegistrations.bind(orphansController));
    fastify.post('/app-registrations/adopt', orphansController.adoptAppRegistration.bind(orphansController));

    // Backends
    fastify.get('/backends', orphansController.getOrphanBackends.bind(orphansController));
    fastify.post('/backends/adopt', orphansController.adoptBackend.bind(orphansController));
}

