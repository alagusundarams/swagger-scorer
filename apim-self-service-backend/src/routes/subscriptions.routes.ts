/**
 * Subscriptions Routes
 */

import { FastifyPluginAsync } from 'fastify';
import { getSubscriptionSecrets } from '../services/identity/CredentialService.js';
import { getAllSubscriptions, addSubscription, assignSubscriptionTeam } from '../services/inventory/SubscriptionsService.js';

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
        const user = (request as any).user;

        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

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
        const user = (request as any).user;

        if (!user || !user.teams?.length) {
            return reply.code(401).send({ error: 'Unauthorized: Missing team context' });
        }
        const { productId, appId, justification } = request.body as any;

        try {
            const sub = await addSubscription(productId, user.teams[0], user, appId, justification);
            return { success: true, subscription: sub };
        } catch (error: any) {
            fastify.log.error({ err: error, body: request.body }, 'Failed to request subscription');
            return reply.code(500).send({ error: error.message });
        }
    });
    /**
     * PATCH /api/v1/subscriptions/:id/assign
     * Day 1: Assign an orphaned subscription to a team (Admin Only)
     */
    fastify.patch('/subscriptions/:id/assign', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { teamId } = request.body as { teamId: string };
        const user = (request as any).user || { role: 'user' };

        if (user.role !== 'admin') {
            return reply.code(403).send({ error: 'Only admins can assign legacy subscriptions.' });
        }

        try {
            const sub = await assignSubscriptionTeam(id, teamId);
            return { success: true, subscription: sub };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to assign subscription team');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * PATCH /api/v1/subscriptions/:id
     * Update subscription state (e.g. suspend, reactivate)
     */
    fastify.patch('/subscriptions/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { state } = request.body as { state: string };

        // Logic check: Can user suspend their own sub? Or Admin only?
        // Standard: Admin or Team Owner can update state.
        // For Day 1, we'll implement the service call and allow state transitions.

        try {
            const { updateSubscriptionState } = await import('../services/inventory/SubscriptionsService.js');
            await updateSubscriptionState(id, state);
            return { success: true, state };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to update subscription state');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default subscriptionsRoutes;
