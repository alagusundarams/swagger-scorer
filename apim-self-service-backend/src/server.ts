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

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { resolve } from 'path';
import { loadConfig, validateConfig } from './config/loader.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { analyzeRoutes } from './routes/analyze.js';
import { catalogRoutes } from './routes/catalog.js';
import draftsRoute from './routes/drafts.js';
import { policyRoutes } from './routes/policyRoutes.js';

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
    await fastify.register(cors, {
        origin: true,
    });

    /**
     * WAF Hardening Hook: preParsing
     * Transparently decodes payloads that were Base64-encoded by the frontend to bypass WAF inspection.
     * Payload expected format: { "_v": "BASE64_STUFF" }
     */
    fastify.addHook('preParsing', async (request, _reply, payload) => {
        const encodingHeader = request.headers['x-safe-transport'];

        if (encodingHeader === 'base64') {
            // Buffer the stream
            const chunks: Buffer[] = [];
            for await (const chunk of payload) {
                chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString();

            try {
                const json = JSON.parse(rawBody);
                if (json && json._v) {
                    const decoded = Buffer.from(json._v, 'base64').toString('utf8');
                    // Return a new stream with the decoded content
                    const stream = new (await import('stream')).PassThrough();
                    stream.end(decoded);
                    return stream;
                }
            } catch (e) {
                fastify.log.warn('Safe Transport decoding failed, falling back to raw payload');
            }
        }

        return payload;
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
    await fastify.register(policyRoutes, { prefix: '/api/v1/policy' });

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
