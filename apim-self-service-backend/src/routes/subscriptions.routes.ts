/**
 * Subscriptions Routes
 */

import { FastifyPluginAsync } from 'fastify';
import { getSubscriptionSecrets } from '../services/credential.service.js';
import { getAllSubscriptions, addSubscription } from '../services/subscriptions.service.js';

const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * GET /api/v1/subscriptions
     * Get all subscriptions (filtered by team if not admin)
     */
    fastify.get('/subscriptions', async (request, reply) => {
        const user = (request as any).user || { email: 'anonymous', role: 'user', teams: [] };

        try {
            const subscriptions = await getAllSubscriptions(user.role, user.teams[0]); // Using first team for now
            return { success: true, count: subscriptions.length, subscriptions };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get subscriptions');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/subscriptions/:id/secrets
     * Securely fetch secrets for a subscription on-demand
     */
    fastify.get('/subscriptions/:id/secrets', async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = (request as any).user || { email: 'local-dev@company.com', role: 'admin', teams: ['admin-group'] };

        try {
            const secrets = await getSubscriptionSecrets(
                id,
                user.teams || [],
                user.role
            );
            return { success: true, secrets };
        } catch (error: any) {
            const status = error.message === 'Unauthorized' ? 403 : 500;
            fastify.log.error({ err: error, subId: id, user: user.email }, 'Failed to fetch subscription secrets');
            return reply.code(status).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/subscriptions
     * Request a new subscription
     */
    fastify.post('/subscriptions', async (request, reply) => {
        const user = (request as any).user || { name: 'Local Dev', email: 'local-dev@company.com', teams: ['test-team'] };
        const { productId, appId, justification } = request.body as any;

        try {
            const sub = await addSubscription(productId, user.teams[0], user, appId, justification);
            return { success: true, subscription: sub };
        } catch (error: any) {
            fastify.log.error({ err: error, body: request.body }, 'Failed to request subscription');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default subscriptionsRoutes;
