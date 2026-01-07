import { FastifyReply, FastifyRequest } from 'fastify';
import {
    getBackends,
    getBackend,
    upsertBackend,
    deleteBackend
} from '../services/inventory/BackendsService.js';

export class BackendsController {

    /**
     * Get all backends for an environment
     */
    async getBackends(request: FastifyRequest, reply: FastifyReply) {
        const { environment } = request.query as any;

        if (!environment) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Environment is required' });
        }

        const userContext = {
            role: (request as any).user?.role || 'consumer',
            groups: (request as any).user?.groups || []
        };

        try {
            const backends = await getBackends(environment, userContext);
            return backends;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching backends');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Get a specific backend
     */
    async getBackend(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { environment } = request.query as any;

        if (!environment) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Environment is required' });
        }

        const userContext = {
            role: (request as any).user?.role || 'consumer',
            groups: (request as any).user?.groups || []
        };

        try {
            const backend = await getBackend(id, environment, userContext);
            if (!backend) {
                return reply.status(404).send({ error: 'Not Found', message: 'Backend not found' });
            }
            return backend;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching backend');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Create or Update a backend
     */
    async upsertBackend(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;

        try {
            const backend = await upsertBackend(body);
            return backend;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error upserting backend');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Delete a backend
     */
    async deleteBackend(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { environment } = request.query as any;

        if (!environment) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Environment is required' });
        }

        const userContext = {
            role: (request as any).user?.role || 'consumer',
            groups: (request as any).user?.groups || []
        };

        try {
            const success = await deleteBackend(id, environment, userContext);
            if (!success) {
                return reply.status(404).send({ error: 'Not Found', message: 'Backend not found or not deleted' });
            }
            return { success: true };
        } catch (error: any) {
            if (error.message.includes('Forbidden')) {
                return reply.status(403).send({ error: 'Forbidden', message: error.message });
            }
            request.log.error({ err: error }, 'Error deleting backend');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
