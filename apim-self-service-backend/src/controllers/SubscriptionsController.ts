import { FastifyReply, FastifyRequest } from 'fastify';
import { getAllSubscriptions, assignSubscriptionTeam, addSubscription } from '../services/inventory/SubscriptionsService.js';
import { getSubscriptionSecrets } from '../services/identity/CredentialService.js';

export class SubscriptionsController {

    async getAllSubscriptions(request: FastifyRequest, reply: FastifyReply) {
        // Admin client passes no params for "all", or "teamId" query param could be used by others
        // Service expects (userRole, teamId)

        // Mocking user role logic until middleware is fully standardized in request.user
        // Assuming admin for now if accessing this admin endpoint, or relying on Service default.
        const userRole = 'admin';
        const { teamId } = request.query as any;

        try {
            const subs = await getAllSubscriptions(userRole, teamId);
            return subs;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching subscriptions');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    async getSecrets(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const user = (request as any).user;

        if (!user) {
            return reply.status(401).send({ error: 'User context not found' });
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
            request.log.error({ err: error, subId: id, user: user.email }, 'Failed to fetch subscription secrets');
            return reply.status(status).send({ error: error.message });
        }
    }

    async createSubscription(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;

        if (!user || !user.teams?.length) {
            return reply.status(401).send({ error: 'User context or teams not found' });
        }
        const { productId, appId, justification } = request.body as any;

        try {
            // Using first team for now as primary subscriber team
            const sub = await addSubscription(productId, user.teams[0], user, appId, justification);
            return { success: true, subscription: sub };
        } catch (error: any) {
            request.log.error({ err: error, body: request.body }, 'Failed to request subscription');
            return reply.status(500).send({ error: error.message });
        }
    }

    async adoptSubscription(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const { teamId } = request.body as { teamId: string };

        if (!teamId) {
            return reply.status(400).send({ error: 'teamId is required' });
        }

        try {
            const sub = await assignSubscriptionTeam(id, teamId);
            return sub;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adopting subscription');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
