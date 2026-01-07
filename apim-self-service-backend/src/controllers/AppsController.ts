import { FastifyReply, FastifyRequest } from 'fastify';
import { getAppRegistrations, addAppRegistration } from '../services/identity/AppsService.js';

export class AppsController {

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
