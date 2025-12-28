/**
 * Inventory Routes
 * 
 * Real endpoints for orphaned resources and AD groups
 */

import { FastifyPluginAsync } from 'fastify';
import { getOrphanedResources, getAdGroups } from '../services/orphaned-resources.service.js';

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
    fastify.get('/inventory/ad-groups', async (request, reply) => {
        try {
            const groups = await getAdGroups();
            return { success: true, count: groups.length, groups };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get AD groups');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default inventoryRoutes;
