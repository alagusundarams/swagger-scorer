import { FastifyReply, FastifyRequest } from 'fastify';
import {
    getAllProducts,
    getProductById,
    updateProduct,
    addProduct,
    getProductPolicy,
    updateProductPolicy,
    ejectProduct,
    getSecureProductSpec,
    getGlobalInventory,
    getPermissionMatrix,
    updatePermissionMatrix
} from '../services/inventory/ProductsService.js';
import { promoteProduct } from '../services/workflow/PromotionService.js';
import { getSubscriptionsForProduct } from '../services/inventory/SubscriptionsService.js';

export class ProductsController {

    /**
     * Get all products with optional filtering and pagination
     */
    async getProducts(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { environment, role, teamId, groups, page, limit } = request.query as any;
            const userGroups = groups ? groups.split(',') : [];

            // Parse pagination params
            const pageNum = page ? parseInt(page) : undefined;
            const limitNum = limit ? parseInt(limit) : undefined;

            const result = await getAllProducts(
                environment, role, teamId, userGroups, pageNum, limitNum
            );

            return result;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching products');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Get global inventory (Admin view)
     */
    async getGlobalInventory(request: FastifyRequest, reply: FastifyReply) {
        try {
            const inventory = await getGlobalInventory();
            return inventory;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching global inventory');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch inventory' });
        }
    }

    /**
     * Get a single product by ID
     */
    async getProduct(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { environment, groups, role, teams } = request.query as any;

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
            request.log.error({ err: error }, 'Error fetching product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch product' });
        }
    }

    /**
     * Create a new product
     */
    async createProduct(request: FastifyRequest, reply: FastifyReply) {
        try {
            const product = await addProduct(request.body as any);
            return product;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adding product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Update an existing product
     */
    async updateProduct(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const body = request.body as any;
        const { groups, role, teams } = request.query as any;

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
            request.log.error({ err: error }, 'Error updating product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update product' });
        }
    }

    /**
     * Get Product Policy XML
     */
    async getPolicy(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const policy = await getProductPolicy(id);
            return policy;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching product policy');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Update Product Policy XML
     */
    async updatePolicy(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { xml } = request.body as any;
        const { groups, role, teams } = request.query as any;

        const userContext = {
            id: (request as any).user?.id || 'system-user',
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
            request.log.error({ err: error }, 'Error updating product policy');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Eject Product to Self-Service
     */
    async ejectProduct(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const product = await ejectProduct(id);
            return product;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error ejecting product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Get Secure Product Spec
     */
    async getSpec(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { groups } = request.query as any;

        try {
            const userGroups = groups ? groups.split(',') : [];
            const spec = await getSecureProductSpec(id, userGroups);
            return { spec };
        } catch (error: any) {
            if (error.message.includes('ACCESS_DENIED')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            request.log.error({ err: error }, 'Error fetching product spec');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Promote Product to next environment
     */
    async promoteProduct(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { targetEnv, policyXml, variables } = request.body as any;
        try {
            const result = await promoteProduct(id, targetEnv, 'system-user', policyXml, variables);
            return result;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error promoting product');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Get Permission Matrix
     */
    async getPermissions(request: FastifyRequest, reply: FastifyReply) {
        const { productId } = request.params as any;
        try {
            const matrix = await getPermissionMatrix(productId);
            return matrix;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching permission matrix');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch permissions' });
        }
    }

    /**
     * Update Permission Matrix
     */
    async updatePermissions(request: FastifyRequest, reply: FastifyReply) {
        const { productId } = request.params as any;
        const body = request.body as any;
        const entries = body.entries || body;
        try {
            const matrix = await updatePermissionMatrix(productId, entries);
            return matrix;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error updating permission matrix');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update permissions' });
        }
    }

    /**
     * Get Product Subscriptions
     */
    async getProductSubscriptions(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const subscriptions = await getSubscriptionsForProduct(id);
            return subscriptions;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching product subscriptions');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
