/**
 * @fileoverview Catalog Routes
 * 
 * Fastify routes for Products, Teams, and Subscriptions.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getAppConfig } from '../config/loader.js';
import {
    getAllProducts, getAllApis, updateProduct, getGlobalInventory,
    getPermissionMatrix, updatePermissionMatrix, addProduct, addApi,
    getOperations, searchApis, removeApi, getProductPolicy,
    updateProductPolicy, ejectProduct, syncProductOperations, getProductById, getApiById,
    getSecureProductSpec
} from '../services/inventory/ProductsService.js';
import {
    getNamedValues, createNamedValue as addNamedValue, deleteNamedValue
} from '../services/inventory/NamedValuesService.js';
import {
    updateApproval,
    getAllApprovals
} from '../services/workflow/ApprovalsService.js';
import { getAllTeams, createTeam, updateTeam } from '../services/identity/TeamsService.js';
// Subscriptions moved to dedicated routes
import { auditService } from '../services/core/AuditService.js';
import { getAppRegistrations, addAppRegistration } from '../services/identity/AppsService.js';
import { promoteProduct } from '../services/workflow/PromotionService.js';

// Mocks (Conditionally used or effectively swapped at runtime if needed, 
// but for static imports we rely on the main service having fallback or logic)
// To fully support "dynamic mocks" with static imports, services usually internally check config.
// Since spec-fetcher and scoring services were dynamically imported based on config,
// we might need to keep them dynamic OR standardizing them to handle mocks internally.
// "products.service.ts" already handles APIM mocks internally.
// "spec-fetcher.service.ts" does NOT appear to handle mocks internally in the previous code (it imported .mock.js).
// So for spec-fetcher and scoring, I will KEEP logic to resolve the implementation, but maybe move it to a helper or keep dynamic import for THAT specific case if internal mock handling isn't ready.
// However, the prompt asked to "separate controller from service".
// I will keep the dynamic resolution for Mocks *where strictly necessary* (like spec fetcher if it swaps files completely) 
// but standardizing is better. For now, I'll stick to dynamic for Spec/Scoring to avoid breakage, but static for Products.

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

    fastify.get('/products', async (request, reply) => {
        try {
            const { environment, role, teamId, groups, page, limit } = request.query as any;
            const userGroups = groups ? groups.split(',') : [];

            // Parse pagination params
            const pageNum = page ? parseInt(page) : undefined;
            const limitNum = limit ? parseInt(limit) : undefined;

            const result = await getAllProducts(
                environment, role, teamId, userGroups, pageNum, limitNum
            );

            return result; // Returns { products } or { products, pagination }
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching products');
            return reply.status(500).send({ error: 'Internal Server Error', message: (error as Error).message });
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

    // GET /api/v1/products/:id (Single Product + Env Context)
    fastify.get('/products/:id', async (request, reply) => {
        const { id } = request.params as any;
        const { environment, groups, role, teams } = request.query as any;

        // Construct User Context for RBAC
        const userContext = {
            role: role || 'consumer',
            teams: teams ? teams.split(',') : [],
            groups: groups ? groups.split(',') : []
        };

        try {
            const product = await getProductById(id, environment, userContext);
            if (!product) {
                return reply.status(404).send({ error: 'Not Found', message: 'Product not found' });
            }
            return product;
        } catch (error: any) {
            if (error.message.includes('ACCESS_DENIED')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            fastify.log.error({ err: error }, 'Error fetching product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch product' });
        }
    });

    fastify.patch('/products/:id', async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        const { groups, role, teams } = request.query as any;

        // Construct User Context
        const userContext = {
            role: role || (request as any).user?.role || 'consumer',
            teams: teams ? teams.split(',') : (request as any).user?.teams || [],
            groups: groups ? groups.split(',') : (request as any).user?.groups || []
        };

        try {
            const product = await updateProduct(id, body, userContext);
            return product;
        } catch (error: any) {
            if (error.message.includes('ACCESS_DENIED')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            fastify.log.error({ err: error }, 'Error updating product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update product' });
        }
    });

    fastify.put('/products/:id', async (request, _reply) => {
        return fastify.inject({
            method: 'PATCH',
            url: `/api/v1/products/${(request.params as any).id}`,
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
    });

    // POST /api/v1/products (Direct onboarding)
    fastify.post('/products', async (request, reply) => {
        try {
            const product = await addProduct(request.body as any);
            return product;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error adding product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/products/:id/policy (Product Policy)
    fastify.get('/products/:id/policy', async (request, reply) => {
        const { id } = request.params as any;
        try {
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
        const { groups, role, teams } = request.query as any;

        const userContext = {
            role: role || (request as any).user?.role || 'consumer',
            teams: teams ? teams.split(',') : (request as any).user?.teams || [],
            groups: groups ? groups.split(',') : (request as any).user?.groups || []
        };

        try {
            const result = await updateProductPolicy(id, xml, userContext);
            return result;
        } catch (error: any) {
            if (error.message.includes('ACCESS_DENIED')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            fastify.log.error({ err: error }, 'Error updating product policy');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/api-inventory/:id (Helper for Policy Studio to get specs)
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
                // Return git_repo_url as swagger_url for now, or null if strictly needed.
                // In a real app we might proxy or return a blob url.
                swagger_url: api.git_repo_url // Simplification for POC
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching API inventory');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch API inventory' });
        }
    });

    // POST /api/v1/products/:id/eject (Eject to Self-Service)
    fastify.post('/products/:id/eject', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const product = await ejectProduct(id);
            return product;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error ejecting product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/products/:id/spec (Product Spec)
    fastify.get('/products/:id/spec', async (request, reply) => {
        const { id } = request.params as any;
        const { groups } = request.query as any;

        try {
            const userGroups = groups ? groups.split(',') : [];
            const spec = await getSecureProductSpec(id, userGroups);

            // Trigger background sync of operations
            // This ensures the "Interface Catalog" is populated with endpoints found in this spec
            syncProductOperations(id).catch(err =>
                fastify.log.error({ err }, 'Background sync of operations failed')
            );

            return { spec };
        } catch (error: any) {
            if (error.message.includes('ACCESS_DENIED')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            fastify.log.error({ err: error }, 'Error fetching product spec');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // Alias for /Spec (Uppercase compatibility)
    fastify.get('/products/:id/Spec', async (request, _reply) => {
        return fastify.inject({
            method: 'GET',
            url: `/api/v1/products/${(request.params as any).id}/spec`
        }).then(res => JSON.parse(res.payload));
    });

    // POST /api/v1/products/:id/promote
    fastify.post('/products/:id/promote', async (request, reply) => {
        const { id } = request.params as any;
        const { targetEnv, policyXml, variables } = request.body as any;
        try {
            const result = await promoteProduct(id, targetEnv, 'system-user', policyXml, variables);
            return result;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error promoting product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // POST /api/v1/products/:id/apis (Add API)
    fastify.post('/products/:id/apis', async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        try {
            // Ensure productId matches path param
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
            await removeApi(apiId, id);
            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error removing API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/products/:id/apis/:apiId/operations
    fastify.get('/products/:id/apis/:apiId/operations', async (request, reply) => {
        const { apiId } = request.params as any;
        try {
            const operations = await getOperations(apiId);
            return operations;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error fetching operations');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // POST /api/v1/apis (Direct onboarding)
    fastify.post('/apis', async (request, reply) => {
        try {
            const api = await addApi(request.body as any);
            return api;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error adding API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/v1/apis/search
    fastify.get('/apis/search', async (request, reply) => {
        const { q } = request.query as any;
        try {
            const apis = await searchApis(q || '');
            return apis;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error searching APIs');
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

    // POST /api/v1/teams
    fastify.post('/teams', async (request, reply) => {
        try {
            const team = await createTeam(request.body);
            return team;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error creating team');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // PATCH /api/v1/teams/:id
    fastify.patch('/teams/:id', async (request, reply) => {
        const { id } = request.params as any;
        try {
            const team = await updateTeam(id, request.body);
            return team;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error updating team');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
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

    // NOTE: /subscriptions routes moved to src/routes/subscriptions.routes.ts

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
            const logs = await auditService.queryLogs({ resourceId: entityId, limit: 100 });
            return logs;
        } catch (error) {
            fastify.log.error({ err: error }, 'Error fetching audit logs');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch audit logs' });
        }
    });

    // POST /api/v1/admin/score-products (Trigger background scoring job)
    fastify.post('/admin/score-products', async (_request, reply) => {
        try {
            const config = getAppConfig();
            const isMock = config.useBackendMocks;
            const { scoreAllProducts } = isMock
                ? await import('../services/policy/ScoringService.mock.js')
                : await import('../services/policy/ScoringService.js');

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
            const config = getAppConfig();
            const isMock = config.useBackendMocks;
            const { scoreProductById } = isMock
                ? await import('../services/policy/ScoringService.mock.js')
                : await import('../services/policy/ScoringService.js');

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

    // Alias for GET /admin/permissions/:productId
    fastify.get('/admin/permissions/:productId', async (request, _reply) => {
        return fastify.inject({
            method: 'GET',
            url: `/api/v1/permissions/${(request.params as any).productId}`
        }).then(res => JSON.parse(res.payload));
    });

    // Alias for PUT /admin/permissions/:id
    fastify.put('/admin/permissions/:id', async (request, _reply) => {
        return fastify.inject({
            method: 'POST',
            url: `/api/v1/permissions/${(request.params as any).id}`,
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
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
        // const { groups, role, teams } = request.query as any;

        // const userContext = {
        //     role: role || (request as any).user?.role || 'consumer',
        //     teams: teams ? teams.split(',') : (request as any).user?.teams || [],
        //     groups: groups ? groups.split(',') : (request as any).user?.groups || []
        // };

        try {
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
            const value = await addNamedValue(id, body);
            return value;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error adding named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // POST /api/v1/products/:id/named-values/check-duplicate
    fastify.post('/products/:id/named-values/check-duplicate', async (request, reply) => {
        const { systemName, environment } = request.body as any;
        try {
            const { checkNamedValueDuplicate } = await import('../services/inventory/NamedValuesService.js');
            const result = await checkNamedValueDuplicate(systemName, environment);
            return result;
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error checking duplicate');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // DELETE /api/v1/products/:id/named-values/:valueId
    fastify.delete('/products/:id/named-values/:valueId', async (request, reply) => {
        const { id, valueId } = request.params as any;
        try {
            await deleteNamedValue(id, valueId);
            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error deleting named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });
}
