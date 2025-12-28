/**
 * Policy Display Routes
 * 
 * Gateway-agnostic endpoints
 * Backend parses policies, returns display metadata
 */

import { FastifyPluginAsync } from 'fastify';
import { query } from '../services/db.js';
import { getGatewayService } from '../services/gateway-factory.js';

const policyDisplayRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /api/v1/products/:id/policy-display
     * Get parsed policy for display (backend parsing)
     */
    fastify.get('/products/:id/policy-display', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            // Get product with policy XML
            const result = await query(`
                SELECT id, policy_xml, gateway_type
                FROM products
                WHERE id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return reply.code(404).send({ error: 'Product not found' });
            }

            const product = result.rows[0];
            const gatewayType = product.gateway_type || 'apim';  // Default to APIM
            const policyXml = product.policy_xml || '';

            // Get gateway service
            const gateway = getGatewayService(gatewayType);

            // Parse to display structure (backend processing)
            const displayStructure = gateway.parseToDisplayStructure(policyXml);

            return {
                success: true,
                productId: id,
                displayStructure
            };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get policy display');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/products/:id/policy-validate
     * Validate policy syntax
     */
    fastify.post('/products/:id/policy-validate', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { policyXml } = request.body as { policyXml: string };

        try {
            // Get product to determine gateway type
            const result = await query(`
                SELECT gateway_type FROM products WHERE id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return reply.code(404).send({ error: 'Product not found' });
            }

            const gatewayType = result.rows[0].gateway_type || 'apim';
            const gateway = getGatewayService(gatewayType);

            // Validate
            const validation = gateway.validatePolicy(policyXml);

            return { success: true, validation };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to validate policy');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default policyDisplayRoutes;
