import { FastifyReply, FastifyRequest } from 'fastify';
import {
    addApi,
    removeApi,
    getOperations,
    searchApis,
    getAllApis
} from '../services/inventory/ProductsService.js';

export class ApisController {

    /**
     * Get all APIs
     */
    async getAllApis(request: FastifyRequest, reply: FastifyReply) {
        try {
            const apis = await getAllApis();
            return apis;
        } catch (error: any) {
            request.log.error({ err: error }, 'Failed to get APIs');
            return reply.code(500).send({ error: error.message });
        }
    }

    /**
     * Add a new API (optionally linked to a product)
     */
    async createApi(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = request.body as any;
            const params = request.params as any;

            // If called via /products/:id/apis, ensure productId is set
            const productId = params.id || body.productId;

            const api = await addApi({ ...body, productId });
            return api;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adding API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Remove an API from a product
     */
    async deleteApi(request: FastifyRequest, reply: FastifyReply) {
        const { id, apiId } = request.params as any;
        try {
            await removeApi(apiId, id);
            return { success: true };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error removing API');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Get operations for a specific API
     */
    async getOperations(request: FastifyRequest, reply: FastifyReply) {
        const { apiId } = request.params as any;
        try {
            const operations = await getOperations(apiId);
            return operations;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching operations');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Search APIs
     */
    async searchApis(request: FastifyRequest, reply: FastifyReply) {
        const { q } = request.query as any;
        try {
            const apis = await searchApis(q || '');
            return apis;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error searching APIs');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
