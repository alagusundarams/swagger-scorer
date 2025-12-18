/**
 * @fileoverview Health check API route
 * 
 * Simple endpoint to check if the server is running.
 * Useful for monitoring and load balancers.
 */

import { FastifyInstance } from 'fastify';

/**
 * Register health check route
 * 
 * GET /api/v1/health
 * Returns: { status, version, uptime, timestamp }
 * 
 * @param fastify - Fastify instance
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/v1/health', async (_request, reply) => {
        return reply.send({
            status: 'healthy',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });
}
