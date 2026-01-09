/**
 * @fileoverview Catalog Routes
 * 
 * Fastify routes for Products, Teams, and Subscriptions.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';


import { getApiById } from '../services/inventory/ProductsService.js';

// Controllers retrieved from container in route function
export async function catalogRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
    const {
        productsController,
        apisController,
        namedValuesController,
        adminController,
        teamsController,
        approvalsController,
        appsController,
        auditController,
        subscriptionsController,
        dashboardController
    } = fastify.container; // Augmentation in server.ts makes this valid

    // ==========================================
    // SYSTEM / CONFIG ROUTES
    // ==========================================

    fastify.get('/environments', async (_req, _reply) => {
        // Return configured environments. 
        // Ideally from config, but defaulting to standard set for now.
        return ['dev', 'qa', 'prod'];
    });

    fastify.get('/admin/dashboard', dashboardController.getDashboardStats);

    // ==========================================
    // PRODUCTS ROUTES
    // ==========================================

    // GET /api/v1/admin/global-inventory (Aggregated view for admins)
    fastify.get('/admin/global-inventory', productsController.getGlobalInventory);

    // GET /api/v1/products (Consumer view)
    fastify.get('/products', productsController.getProducts);

    // GET /api/v1/admin/products (Admin view)
    fastify.get('/admin/products', productsController.getProducts);

    // GET /api/v1/products/:id
    fastify.get('/products/:id', productsController.getProduct);

    // PATCH /api/v1/products/:id
    fastify.patch('/products/:id', productsController.updateProduct);

    // PUT /api/v1/products/:id (Legacy alias)
    fastify.put('/products/:id', async (request, _reply) => {
        return fastify.inject({
            method: 'PATCH',
            url: `/api/v1/products/${(request.params as any).id}`,
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
    });

    // POST /api/v1/products
    fastify.post('/products', productsController.createProduct);

    // GET /api/v1/products/:id/policy
    fastify.get('/products/:id/policy', productsController.getPolicy);

    // PUT /api/v1/products/:id/policy
    fastify.put('/products/:id/policy', productsController.updatePolicy);

    // POST /api/v1/products/:id/eject
    fastify.post('/products/:id/eject', productsController.ejectProduct);

    // GET /api/v1/products/:id/spec
    fastify.get('/products/:id/spec', productsController.getSpec);

    // Alias for /Spec
    fastify.get('/products/:id/Spec', async (request, _reply) => {
        return fastify.inject({
            method: 'GET',
            url: `/api/v1/products/${(request.params as any).id}/spec`
        }).then(res => JSON.parse(res.payload));
    });

    // POST /api/v1/products/:id/promote
    fastify.post('/products/:id/promote', productsController.promoteProduct);

    // GET /api/v1/products/:id/subscriptions
    fastify.get('/products/:id/subscriptions', productsController.getProductSubscriptions);

    // ==========================================
    // APIs ROUTES
    // ==========================================

    // GET /api/v1/apis (Global list)
    fastify.get('/apis', apisController.getAllApis);

    // GET /api/v1/apis/search
    fastify.get('/apis/search', apisController.searchApis);

    // POST /api/v1/apis
    fastify.post('/apis', apisController.createApi);

    // POST /api/v1/products/:id/apis (Add API to Product)
    fastify.post('/products/:id/apis', apisController.createApi);

    // DELETE /api/v1/products/:id/apis/:apiId
    fastify.delete('/products/:id/apis/:apiId', apisController.deleteApi);

    // GET /api/v1/products/:id/apis/:apiId/operations
    fastify.get('/products/:id/apis/:apiId/operations', apisController.getOperations);

    // GET /api/v1/api-inventory/:id (Helper for Policy Studio)
    // NOTE: This uses getApiById from service directly as it needs valid DTO transform not in controller yet.
    fastify.get('/api-inventory/:id', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const api = await getApiById(id);
            if (!api) {
                return reply.status(404).send({ error: 'Not Found', message: 'API not found' });
            }

            return {
                id: api.id,
                name: api.name,
                swagger_url: api.git_repo_url
            };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error fetching API inventory');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // ==========================================
    // PERMISSIONS ROUTES
    // ==========================================

    fastify.get('/permissions/:productId', productsController.getPermissions);

    fastify.post('/permissions/:productId', productsController.updatePermissions);

    // Aliases
    fastify.get('/admin/permissions/:productId', async (request, _reply) => {
        return fastify.inject({
            method: 'GET',
            url: `/api/v1/permissions/${(request.params as any).productId}`
        }).then(res => JSON.parse(res.payload));
    });

    fastify.put('/admin/permissions/:id', async (request, _reply) => {
        return fastify.inject({
            method: 'POST',
            url: `/api/v1/permissions/${(request.params as any).id}`,
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
    });

    // ==========================================
    // TEAMS ROUTES
    // ==========================================

    fastify.get('/teams', teamsController.getAllTeams);

    fastify.post('/teams', teamsController.createTeam);

    fastify.patch('/teams/:id', teamsController.updateTeam);

    // ==========================================
    // APPROVALS ROUTES
    // ==========================================

    fastify.get('/approvals', approvalsController.getAllApprovals);

    fastify.patch('/approvals/:id', approvalsController.updateApproval);

    // ==========================================
    // AUDIT ROUTES
    // ==========================================

    fastify.get('/audit-logs', auditController.getAuditLogs);

    // ==========================================
    // APP REGISTRATION ROUTES
    // ==========================================

    fastify.get('/apps/search', appsController.searchApps);
    fastify.get('/apps', appsController.getApps);

    fastify.post('/apps', appsController.addApp);

    // ==========================================
    // NAMED VALUES ROUTES
    // ==========================================

    fastify.get('/products/:id/named-values', namedValuesController.getNamedValues);

    fastify.post('/products/:id/named-values', namedValuesController.createNamedValue);

    fastify.post('/products/:id/named-values/check-duplicate', namedValuesController.checkDuplicate);

    fastify.delete('/products/:id/named-values/:valueId', namedValuesController.deleteNamedValue);

    // ==========================================
    // SUBSCRIPTIONS ROUTES
    // ==========================================

    fastify.get('/subscriptions', subscriptionsController.getAllSubscriptions);

    fastify.get('/subscriptions/:id/secrets', subscriptionsController.getSecrets);

    fastify.post('/subscriptions', subscriptionsController.createSubscription);

    fastify.post('/subscriptions/:id/adopt', subscriptionsController.adoptSubscription);

    // Alias for legacy assign route
    fastify.put('/subscriptions/:id/assign', subscriptionsController.adoptSubscription);

    // ==========================================
    // SCORING ROUTES (Admin)
    // ==========================================

    fastify.post('/admin/score-products', adminController.scoreAllProducts);

    fastify.post('/admin/score-product/:id', adminController.scoreProduct);
}
