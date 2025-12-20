/**
 * @fileoverview Catalog Routes
 * 
 * Fastify routes for Products, Teams, and Subscriptions.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as catalogService from '../services/catalog.service.js';

export async function catalogRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    // GET /api/v1/products
    fastify.get('/products', async (_request, reply) => {
        try {
            const products = await catalogService.getAllProducts();
            return products;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching products');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch products' });
        }
    });

    // GET /api/v1/api-teams (Matching frontend expected path)
    fastify.get('/api-teams', async (_request, reply) => {
        try {
            const teams = await catalogService.getAllTeams();
            return teams;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching teams');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch teams' });
        }
    });

    // GET /api/v1/subscriptions
    fastify.get('/subscriptions', async (_request, reply) => {
        try {
            const subs = await catalogService.getAllSubscriptions();
            return subs;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching subscriptions');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch subscriptions' });
        }
    });
}
