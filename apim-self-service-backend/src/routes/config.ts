/**
 * @fileoverview Config API route
 * 
 * Returns the current scoring configuration.
 * This is read-only - users can see the config but not modify it via API.
 */

import { FastifyInstance } from 'fastify';
import { ScoringConfig } from '../types/index.js';

/**
 * Register config route
 * 
 * GET /api/v1/config
 * Returns: Current scoring configuration (categories, weights, thresholds)
 * 
 * @param fastify - Fastify instance
 * @param config - Scoring configuration
 */
export async function configRoutes(
    fastify: FastifyInstance,
    config: ScoringConfig
): Promise<void> {
    fastify.get('/config', async (_request, reply) => {
        // Return the config as-is
        // In the future, we might want to hide certain internal fields
        return reply.send(config);
    });
}
