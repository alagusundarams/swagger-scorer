
import { FastifyInstance } from 'fastify';
import { PolicyController } from '../controllers/PolicyController.js';

export async function policyRoutes(fastify: FastifyInstance) {
    const controller = new PolicyController();

    fastify.post('/analyze', controller.parsePolicy);
    fastify.post('/generate', controller.generateXml);
    fastify.post('/deploy', controller.deployPolicy);
    fastify.get('/fetch/:resourceId', controller.getPolicy);
}
