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

    // PATCH /api/v1/subscriptions/:id
    fastify.patch('/subscriptions/:id', async (request, reply) => {
        const { id } = request.params as any;
        const { state } = request.body as any;
        try {
            // In a real app, this would update keys, expiry, etc.
            await catalogService.updateSubscriptionState(id, state);
            return { success: true };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error updating subscription');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update subscription' });
        }
    });

    // POST /api/v1/subscriptions (Request Access)
    fastify.post('/subscriptions', async (request, reply) => {
        const { productId, teamId } = request.body as any;
        try {
            const requester = { name: 'Portal User', email: 'user@portal.dev' };
            const sub = await catalogService.addSubscription(productId, teamId, requester);
            return sub;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error creating subscription');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to request access' });
        }
    });

    // GET /api/v1/approvals
    fastify.get('/approvals', async (_request, reply) => {
        try {
            const approvals = await catalogService.getAllApprovals();
            return approvals;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching approvals');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch approvals' });
        }
    });

    // PATCH /api/v1/approvals/:id (Process Approval)
    fastify.patch('/approvals/:id', async (request, reply) => {
        const { id } = request.params as any;
        const { status } = request.body as any;
        try {
            const approval = await catalogService.updateApproval(id, status, 'Admin User');
            return approval;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error processing approval');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to process approval' });
        }
    });
}
