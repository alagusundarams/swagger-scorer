/**
 * @fileoverview Catalog Routes
 * 
 * Fastify routes for Products, Teams, and Subscriptions.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getAllProducts, updateProduct, getGlobalInventory, getPermissionMatrix, updatePermissionMatrix } from '../services/products.service.js';
import { getAllTeams } from '../services/teams.service.js';
import { getAllSubscriptions, addSubscription, updateSubscriptionState } from '../services/subscriptions.service.js';
import { getAllApprovals, updateApproval } from '../services/approvals.service.js';
import { getAuditLogs } from '../services/audit.service.js';
import { scoreAllProducts, scoreProductById } from '../services/scoring.service.js';
import { getAppRegistrations, addAppRegistration } from '../services/apps.service.js';

export async function catalogRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    // GET /api/v1/admin/global-inventory (Aggregated view for admins)
    fastify.get('/admin/global-inventory', async (_request, reply) => {
        try {
            const inventory = await getGlobalInventory();
            return inventory;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching global inventory');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch inventory' });
        }
    });

    // GET /api/v1/products?environment=DEV&role=admin&teamId=xxx (with role-based filtering)
    fastify.get('/products', async (request, reply) => {
        try {
            const { environment, role, teamId } = request.query as any;
            const products = await getAllProducts(environment, role, teamId);
            return products;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching products');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch products' });
        }
    });

    // GET /api/v1/admin/products?environment=DEV&role=admin&teamId=xxx (Admin view with role-based filtering)
    fastify.get('/admin/products', async (request, reply) => {
        try {
            const { environment, role, teamId } = request.query as any;
            const products = await getAllProducts(environment, role, teamId);
            return products;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching admin products');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch products' });
        }
    });

    // PATCH /api/v1/products/:id (Update product metadata/ownership)
    fastify.patch('/products/:id', async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        try {
            const product = await updateProduct(id, body);
            return product;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error updating product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update product' });
        }
    });

    // GET /api/v1/api-teams (Matching frontend expected path)
    fastify.get('/api-teams', async (_request, reply) => {
        try {
            const teams = await getAllTeams();
            return teams;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching teams');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch teams' });
        }
    });

    // GET /api/v1/subscriptions?role=admin&teamId=xxx (with role-based filtering)
    fastify.get('/subscriptions', async (request, reply) => {
        try {
            const { role, teamId } = request.query as any;
            const subs = await getAllSubscriptions(role, teamId);
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
            await updateSubscriptionState(id, state);
            return { success: true };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error updating subscription');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update subscription' });
        }
    });

    // POST /api/v1/subscriptions (Request Access)
    fastify.post('/subscriptions', async (request, reply) => {
        const body = request.body as any;
        const productId = body.productId;
        const teamId = body.teamId || body.subscriberTeamId;
        const appId = body.appId;
        const justification = body.justification;
        try {
            const requester = { name: 'Portal User', email: 'user@portal.dev' };
            const sub = await addSubscription(productId, teamId, requester, appId, justification);
            return sub;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error creating subscription');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to request access' });
        }
    });

    // GET /api/v1/approvals
    fastify.get('/approvals', async (_request, reply) => {
        try {
            const approvals = await getAllApprovals();
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
            const approval = await updateApproval(id, status, 'Admin User');
            return approval;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error processing approval');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to process approval' });
        }
    });

    // GET /api/v1/audit-logs
    fastify.get('/audit-logs', async (request, reply) => {
        const { entityId } = request.query as any;
        try {
            const logs = await getAuditLogs(entityId);
            return logs;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching audit logs');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch audit logs' });
        }
    });

    // POST /api/v1/admin/score-products (Trigger background scoring job)
    fastify.post('/admin/score-products', async (_request, reply) => {
        try {
            // Trigger background job (don't await - return immediately)
            scoreAllProducts()
                .then(result => {
                    fastify.log.info({ result }, 'Background scoring completed');
                })
                .catch(err => {
                    fastify.log.error({ err }, 'Background scoring failed');
                });

            return { message: 'Scoring job started in background' };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error starting scoring job');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to start scoring job' });
        }
    });

    // POST /api/v1/admin/score-product/:id (Score a specific product)
    fastify.post('/admin/score-product/:id', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const score = await scoreProductById(id);
            if (score === null) {
                return reply.status(404).send({ error: 'Not Found', message: 'Product has no OpenAPI spec to score' });
            }
            return { productId: id, qualityScore: score };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error scoring product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to score product' });
        }
    });

    // GET /api/v1/permissions/:productId
    fastify.get('/permissions/:productId', async (request, reply) => {
        const { productId } = request.params as any;
        try {
            const matrix = await getPermissionMatrix(productId);
            return matrix;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching permission matrix');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch permissions' });
        }
    });

    // POST /api/v1/permissions/:productId
    fastify.post('/permissions/:productId', async (request, reply) => {
        const { productId } = request.params as any;
        const body = request.body as any;
        const entries = body.entries || body; // Handle both wrapped and unwrapped
        try {
            const matrix = await updatePermissionMatrix(productId, entries);
            return matrix;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error updating permission matrix');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update permissions' });
        }
    });

    // GET /api/v1/apps
    fastify.get('/apps', async (request, reply) => {
        const { teamId } = request.query as any;
        try {
            const apps = await getAppRegistrations(teamId);
            return apps;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching app registrations');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch apps' });
        }
    });

    // POST /api/v1/apps (Link an app)
    fastify.post('/apps', async (request, reply) => {
        const body = request.body as any;
        try {
            const app = await addAppRegistration(body);
            return app;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error linking app registration');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to link app' });
        }
    });
}
