import { FastifyReply, FastifyRequest } from 'fastify';
import { getAllSubscriptions, assignSubscriptionTeam } from '../services/inventory/SubscriptionsService.js';

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
