import { FastifyInstance } from 'fastify';
import { generateFlowXml, analyzeXmlToFlow } from '../services/policy/PolicyBuilderService.js';

/**
 * Registers policy management routes
 */
export async function policyRoutes(fastify: FastifyInstance) {

    fastify.post('/analyze', async (request, _reply) => {
        const { xml } = request.body as { xml: string };
        if (!xml) return { inbound: [], backend: [], outbound: [], onError: [] };

        return analyzeXmlToFlow(xml);
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

    fastify.get<{ Params: { resourceId: string }, Querystring: { level: string } }>('/fetch/:resourceId', async (request, reply) => {
        const { resourceId } = request.params;
        const { level } = request.query;

        fastify.log.info({ resourceId, level }, 'Fetching policy for scope');

        try {
            const { getProductPolicy } = await import('../services/inventory/ProductsService.js');
            const result = await getProductPolicy(resourceId);
            return result;
        } catch (error: any) {
            fastify.log.error(error, 'Failed to fetch policy');
            return reply.status(500).send({ error: error.message });
        }
    });

    fastify.post('/deploy', async (request, reply) => {
        const { xml, resourceId } = request.body as { xml: string, resourceId: string };
        // TODO: Get real user context from auth middleware
        const userContext = {
            id: 'system-user',
            role: 'admin',
            teams: [],
            groups: []
        };

        try {
            const { updateProductPolicy } = await import('../services/inventory/ProductsService.js');
            await updateProductPolicy(resourceId, xml, userContext);
            return { commitId: `ops-${Math.random().toString(36).substring(7)}`, success: true };
        } catch (error: any) {
            fastify.log.error(error, 'Failed to update policy');
            return reply.status(500).send({ error: error.message });
        }
    });
}
