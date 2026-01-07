/**
 * Inventory Routes
 * 
 * Real endpoints for orphaned resources and AD groups
 */

import { FastifyPluginAsync } from 'fastify';
import { getOrphanedResources, getAdGroups } from '../services/governance/OrphanedResourcesService.js';
import * as productsService from '../services/inventory/ProductsService.js';

const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /api/v1/inventory/orphaned
     * Get orphaned resources
     */
    fastify.get('/inventory/orphaned', async (request, reply) => {
        const { environment } = request.query as { environment?: string };

        try {
            const resources = await getOrphanedResources(environment);
            return { success: true, count: resources.length, resources };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get orphaned resources');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/inventory/ad-groups
     * Get AD groups (teams)
     */
    fastify.get('/inventory/ad-groups', async (_request, reply) => {
        try {
            const groups = await getAdGroups();
            return { success: true, count: groups.length, groups };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get AD groups');
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.get('/products/:id/manifest', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { format = 'json' } = request.query as { format?: 'json' | 'tfvars' };

        try {
            const content = await productsService.generateManifest(id, format);
            return { success: true, content };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to generate manifest');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default inventoryRoutes;
