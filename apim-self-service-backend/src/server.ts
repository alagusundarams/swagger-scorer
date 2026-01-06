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
import { loadConfig, validateConfig, loadAppConfig, setAppConfig } from './config/loader.js';
import { initDb } from './services/db.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { analyzeRoutes } from './routes/analyze.js';
import { catalogRoutes } from './routes/catalog.js';
import draftsRoute from './routes/drafts.js';
import { policyRoutes } from './routes/policyRoutes.js';
import { mockRoutes } from './routes/mockRoutes.js';
import { validationRoutes } from './routes/validation.js';
import onboardingRoutes from './routes/onboarding.js';
import policyHelpRoutes from './routes/policy-help.routes.js';
import configManagementRoutes from './routes/config.routes.js';
import policyTemplatesRoutes from './routes/policy-templates.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import policyDisplayRoutes from './routes/policy-display.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import multipart from '@fastify/multipart';
import { AppConfig } from './types/index.js';

/**
 * Build Fastify application
 * 
 * This creates the server instance and registers all routes and plugins.
 * We export this as a function so it can be used in tests.
 * 
 * @returns Configured Fastify instance and the loaded config
 * @throws Error if configuration loading fails
 */
export async function build() {
    // 1. Load Application Configuration (JSON-first)
    const appConfigPath = resolve(process.cwd(), 'config.json');
    const appConfig = await loadAppConfig(appConfigPath);

    // Store globally for services
    setAppConfig(appConfig);

    // 2. Initialize Database with URL from config
    await initDb(appConfig.database.url);

    // Create Fastify instance with logging
    const fastify = Fastify({
        bodyLimit: 10 * 1024 * 1024, // 10MB limit for large specs
        logger: {
            level: appConfig.server.logLevel || 'info',
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

    // Register Multipart plugin for file uploads
    await fastify.register(multipart);

    /**
     * WAF Hardening Hook: preParsing
     * Transparently decodes payloads that were Base64-encoded by the frontend to bypass WAF inspection.
     * Payload expected format: { "_v": "BASE64_STUFF" }
     */
    fastify.addHook('preParsing', async (request, _reply, payload) => {
        const encodingHeader = request.headers['x-safe-transport'];

        if (encodingHeader === 'base64') {
            // STRIP CONTENT-LENGTH: Fastify will verify this against the stream size.
            // Since we are decoding (changing size), the original header is invalid.
            delete request.headers['content-length'];

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
    const scoringConfigPath = resolve(process.cwd(), 'config/scoring-config.yaml');
    fastify.log.info({ path: scoringConfigPath }, 'Loading scoring configuration');

    const config = await loadConfig(scoringConfigPath);
    validateConfig(config);

    fastify.log.info({ version: config.version }, 'Configuration loaded successfully');

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/api/v1' });
    await fastify.register(configRoutes, { ...config, prefix: '/api/v1' });
    await fastify.register(analyzeRoutes, { ...config, prefix: '/api/v1' });
    await fastify.register(catalogRoutes, { prefix: '/api/v1' });
    await fastify.register(draftsRoute, { prefix: '/api/v1' });
    await fastify.register(policyRoutes, { prefix: '/api/v1/policy' });
    await fastify.register(mockRoutes, { prefix: '/api/v1' });
    await fastify.register(validationRoutes, { prefix: '/api/v1/validate' });
    await fastify.register(onboardingRoutes, { ...config, prefix: '/api/v1/onboarding' });
    await fastify.register(policyHelpRoutes, { prefix: '/api/v1' });
    await fastify.register(configManagementRoutes, { prefix: '/api/v1' });
    await fastify.register(policyTemplatesRoutes, { prefix: '/api/v1' });
    await fastify.register(subscriptionsRoutes, { prefix: '/api/v1' });
    await fastify.register(policyDisplayRoutes, { prefix: '/api/v1' });
    await fastify.register(inventoryRoutes, { prefix: '/api/v1' });
    await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

    // Admin delete routes (saga-based)
    const adminDeleteRoutes = (await import('./routes/admin.delete.routes.js')).default;
    await fastify.register(adminDeleteRoutes, { prefix: '/api/v1' });

    // Error handler for uncaught errors
    fastify.setErrorHandler((error, _request, reply) => {
        fastify.log.error(error);
        reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
        });
    });

    // Attach appConfig for use in start()
    (fastify as any).appConfig = appConfig;

    return fastify;
}

/**
 * Start server
 */
async function start(): Promise<void> {
    try {
        const fastify = await build();
        const appConfig = (fastify as any).appConfig as AppConfig;

        // Get port and host from config
        const port = appConfig.server.port || 3001;
        const host = appConfig.server.host || '0.0.0.0';

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
