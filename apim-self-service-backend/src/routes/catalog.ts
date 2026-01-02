/**
 * @fileoverview Catalog Routes
 * 
 * Fastify routes for Products, Teams, and Subscriptions.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getAllProducts, getAllApis, updateProduct, getGlobalInventory, getPermissionMatrix, updatePermissionMatrix } from '../services/products.service.js';
import { getAllTeams } from '../services/teams.service.js';
import { getAllSubscriptions, addSubscription, updateSubscriptionState } from '../services/subscriptions.service.js';
import { getAllApprovals, updateApproval } from '../services/approvals.service.js';
import { getAuditLogs } from '../services/audit.service.js';
// import { scoreAllProducts, scoreProductById } from '../services/scoring.service.js'; // Removed for dynamic mock support
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
            const { environment, role, teamId, groups } = request.query as any;
            const userGroups = groups ? groups.split(',') : [];
            const products = await getAllProducts(environment, role, teamId, userGroups);
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

    // GET /api/v1/products/:id/policy (Product Policy)
    fastify.get('/products/:id/policy', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const { getProductPolicy } = await import('../services/products.service.js');
            const policy = await getProductPolicy(id);
            return policy;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error fetching product policy');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // PUT /api/v1/products/:id/policy (Update Product Policy)
    fastify.put('/products/:id/policy', async (request, reply) => {
        const { id } = request.params as any;
        const { xml } = request.body as any;
        try {
            const { updateProductPolicy } = await import('../services/products.service.js');
            const result = await updateProductPolicy(id, xml);
            return result;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error updating product policy');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // POST /api/v1/products/:id/eject (Eject to Self-Service)
    fastify.post('/products/:id/eject', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const { ejectProduct } = await import('../services/products.service.js');
            const product = await ejectProduct(id);

            return product;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error ejecting product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // POST /api/v1/products/:id/apis (Add API)
    fastify.post('/products/:id/apis', async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        try {
            // Ensure productId matches path param
            const { addApi } = await import('../services/products.service.js');
            const api = await addApi({ ...body, productId: id });
            return api;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error adding API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // DELETE /api/v1/products/:id/apis/:apiId (Remove API)
    fastify.delete('/products/:id/apis/:apiId', async (request, reply) => {
        const { id, apiId } = request.params as any;
        try {
            const { removeApi } = await import('../services/products.service.js');
            await removeApi(apiId, id);
            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error removing API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/api-teams (Matching frontend expected path)
    fastify.get('/teams', async (_request, reply) => {
        try {
            const teams = await getAllTeams();
            return teams;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching teams');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch teams' });
        }
    });

    // GET /api/v1/subscriptions?role=admin&teamId=xxx (with role-based filtering)
    fastify.get('/apis', async (_request, reply) => {
        try {
            const apis = await getAllApis();
            return apis;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get APIs');
            return reply.code(500).send({ error: error.message });
        }
    });

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
            const isMock = process.env.USE_BACKEND_MOCKS === 'true';
            const { scoreAllProducts } = isMock
                ? await import('../services/scoring.service.mock.js')
                : await import('../services/scoring.service.js');

            // Trigger background job (don't await - return immediately)
            scoreAllProducts()
                .then((result: any) => {
                    fastify.log.info({ result }, 'Background scoring completed');
                })
                .catch((err: any) => {
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
            const isMock = process.env.USE_BACKEND_MOCKS === 'true';
            const { scoreProductById } = isMock
                ? await import('../services/scoring.service.mock.js')
                : await import('../services/scoring.service.js');

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

    /**
     * NAMED VALUES ROUTES
     */

    // GET /api/v1/products/:id/named-values
    fastify.get('/products/:id/named-values', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const { getNamedValues } = await import('../services/products.service.js');
            const values = await getNamedValues(id);
            return values;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching named values');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch named values' });
        }
    });

    // POST /api/v1/products/:id/named-values
    fastify.post('/products/:id/named-values', async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        try {
            const { addNamedValue } = await import('../services/products.service.js');
            const value = await addNamedValue(id, body);
            return value;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error adding named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // DELETE /api/v1/products/:id/named-values/:valueId
    fastify.delete('/products/:id/named-values/:valueId', async (request, reply) => {
        const { id, valueId } = request.params as any;
        try {
            const { deleteNamedValue } = await import('../services/products.service.js');
            await deleteNamedValue(id, valueId);
            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error deleting named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });
}
