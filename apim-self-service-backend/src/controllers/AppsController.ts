import { FastifyReply, FastifyRequest } from 'fastify';
import { getAppRegistrations, addAppRegistration, searchApps } from '../services/identity/AppsService.js';

export class AppsController {

    async searchApps(request: FastifyRequest, reply: FastifyReply) {
        const { q } = request.query as any;
        if (!q || q.length < 2) return [];
        try {
            const apps = await searchApps(q);
            return apps;
        } catch (error) {
            request.log.error({ err: error }, 'Error searching app registrations');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to search apps' });
        }
    }

    async getApps(request: FastifyRequest, reply: FastifyReply) {
        const { teamId } = request.query as any;
        try {
            const apps = await getAppRegistrations(teamId);
            return apps;
        } catch (error) {
            request.log.error({ err: error }, 'Error fetching app registrations');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch apps' });
        }
    }

    async addApp(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;
        try {
            const app = await addAppRegistration(body);
            return app;
        } catch (error) {
            request.log.error({ err: error }, 'Error linking app registration');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to link app' });
        }
    }
}
