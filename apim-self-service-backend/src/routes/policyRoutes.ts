import { FastifyInstance } from 'fastify';
import { generateFlowXml, analyzeXmlToFlow } from '../services/policy/PolicyBuilderService.js';
import { query } from '../services/core/db.js';

/**
 * Registers policy management routes
 */
export async function policyRoutes(fastify: FastifyInstance) {

    fastify.post('/analyze', async (request, _reply) => {
        const { xml } = request.body as { xml: string };
        if (!xml) return { inbound: [], backend: [], outbound: [], onError: [] };

        return analyzeXmlToFlow(xml);
    });

    fastify.get<{ Params: { resourceId: string }, Querystring: { level: string } }>('/fetch/:resourceId', async (request, reply) => {
        const { resourceId } = request.params;
        const { level } = request.query;

        fastify.log.info({ resourceId, level }, 'Fetching policy for scope');

        try {
            // Fetch from products table (policy_xml column)
            // If resourceId is api-..., we might need to find its product first or assume it's in a separate table.
            // For now, let's assume resourceId is product_id if level is product.

            const result = await query('SELECT policy_xml FROM products WHERE id = $1', [resourceId]);
            const xml = result.rows[0]?.policy_xml || '<policies>\n    <inbound>\n        <base />\n    </inbound>\n</policies>';

            return { xml };
        } catch (error) {
            fastify.log.error(error, 'Failed to fetch policy');
            return reply.status(500).send({ error: 'Failed to fetch policy' });
        }
    });

    fastify.post('/generate', async (request, _reply) => {
        const { flow } = request.body as { flow: any };
        if (!flow) return { xml: '' };

        try {
            const xml = await generateFlowXml(flow);
            return { xml };
        } catch (error: any) {
            fastify.log.error(error, 'Failed to generate XML');
            return { xml: `<!-- Error: ${error.message} -->` };
        }
    });

    fastify.post('/deploy', async (request, reply) => {
        const { xml, resourceId } = request.body as { xml: string, resourceId: string };

        try {
            await query('UPDATE products SET policy_xml = $1, updated_at = NOW() WHERE id = $2', [xml, resourceId]);
            return { commitId: `ops-${Math.random().toString(36).substring(7)}`, success: true };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
