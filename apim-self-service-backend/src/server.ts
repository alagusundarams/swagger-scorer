/**
 * @fileoverview Fastify server entry point
 * 
 * This file creates and configures the Fastify server with:
 * - CORS support
 * - Routes (analyze, health, config)
 * - Error handling
 * - Graceful shutdown
 * 
 * OpenTelemetry instrumentation is handled separately (see below)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { resolve } from 'path';
import { loadConfig, validateConfig } from './config/loader.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { analyzeRoutes } from './routes/analyze.js';
import { catalogRoutes } from './routes/catalog.js';
import draftsRoute from './routes/drafts.js';

/**
 * Build Fastify application
 * 
 * This creates the server instance and registers all routes and plugins.
 * We export this as a function so it can be used in tests.
 * 
 * @returns Configured Fastify instance
 */
export async function build() {
    // Create Fastify instance with logging
    const fastify = Fastify({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
                targets: [
                    {
                        target: 'pino-pretty',
                        options: {
                            translateTime: 'HH:MM:ss Z',
                            ignore: 'pid,hostname',
                            colorize: true
                        }
                    },
                    {
                        target: 'pino/file',
                        options: {
                            destination: 'logs/server.log',
                            mkdir: true
                        }
                    }
                ]
            }
        },
    });

    // Register CORS plugin
    // Allows frontend from any origin (can restrict in production)
    await fastify.register(cors, {
        origin: true, // Allow all origins for now
    });

    // Load scoring configuration
    const configPath = resolve(process.cwd(), 'config/scoring-config.yaml');
    fastify.log.info({ path: configPath }, 'Loading scoring configuration');

    const config = await loadConfig(configPath);
    validateConfig(config);

    fastify.log.info({ version: config.version }, 'Configuration loaded successfully');

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/api/v1' });
    await fastify.register(configRoutes, { ...config, prefix: '/api/v1' });
    await fastify.register(analyzeRoutes, { ...config, prefix: '/api/v1' });
    await fastify.register(catalogRoutes, { prefix: '/api/v1' });
    await fastify.register(draftsRoute, { prefix: '/api/v1' });

    // Error handler for uncaught errors
    fastify.setErrorHandler((error, _request, reply) => {
        fastify.log.error(error);
        reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
        });
    });

    return fastify;
}

/**
 * Start server
 * 
 * This is called when running the server directly (npm run dev or npm start).
 * Not called during tests.
 */
async function start(): Promise<void> {
    try {
        const fastify = await build();

        // Get port from environment or default to 3001
        const port = parseInt(process.env.PORT || '3001', 10);
        const host = process.env.HOST || '0.0.0.0';

        // Start listening
        await fastify.listen({ port, host });

        fastify.log.info(`Server listening on http://${host}:${port}`);
        fastify.log.info(`Health check: http://${host}:${port}/api/v1/health`);
        fastify.log.info(`API docs: http://${host}:${port}/api/v1/config`);

        // Graceful shutdown on SIGTERM/SIGINT
        const gracefulShutdown = async (signal: string): Promise<void> => {
            fastify.log.info(`${signal} received, closing server gracefully`);
            await fastify.close();
            process.exit(0);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start server if this file is run directly
// Check if this is the main module (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
    start();
}
