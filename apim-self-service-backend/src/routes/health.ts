/**
 * @fileoverview Health check API route
 * 
 * Simple endpoint to check if the server is running.
 * Useful for monitoring and load balancers.
 */

import { FastifyInstance } from 'fastify';
import { query } from '../services/core/db.js';

/**
 * Register health check route
 * 
 * GET /api/v1/health
 * Returns: { status, dbStatus, version, uptime, timestamp }
 * 
 * @param fastify - Fastify instance
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/health', async (_request, reply) => {
        let dbStatus = 'healthy';
        try {
            await query('SELECT 1');
        } catch (error) {
            fastify.log.error({ err: error }, 'Database health check failed');
            dbStatus = 'unhealthy';
        }

        return reply.send({
            status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
            dbStatus,
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });
}
