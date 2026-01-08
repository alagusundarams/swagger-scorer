import { FastifyPluginAsync } from 'fastify';
import { getGatewayService } from '../services/gateway/GatewayFactory.js';


const policyDisplayRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /api/v1/products/:id/policy-display
     * Get parsed policy for display (backend parsing)
     */
    fastify.get('/products/:id/policy-display', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const { getProductPolicy } = await import('../services/inventory/ProductsService.js');
            const { ProductsRepository } = await import('../repositories/products.repo.js');
            const productsRepo = new ProductsRepository();

            const { policyXml } = await getProductPolicy(id);
            const productRes = await productsRepo.getProductById(id);
            const product = productRes.rows[0];

            if (!product) return reply.code(404).send({ error: 'Product not found' });

            const gatewayType = product.gateway_type || 'apim';
            const gateway = getGatewayService(gatewayType);
            const displayStructure = gateway.parseToDisplayStructure(policyXml);

            return { success: true, productId: id, displayStructure };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get policy display');
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/products/:id/policy-validate', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { policyXml } = request.body as { policyXml: string };

        try {
            const { ProductsRepository } = await import('../repositories/products.repo.js');
            const productsRepo = new ProductsRepository();
            const productRes = await productsRepo.getProductById(id);
            const product = productRes.rows[0];

            if (!product) return reply.code(404).send({ error: 'Product not found' });

            const gatewayType = product.gateway_type || 'apim';
            const gateway = getGatewayService(gatewayType);
            const validation = gateway.validatePolicy(policyXml);

            return { success: true, validation };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to validate policy');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default policyDisplayRoutes;
