/**
 * @fileoverview Policy Help Routes
 * 
 * CLEAN BOUNDARY: Can be extracted to separate microservice
 */

import { FastifyPluginAsync } from 'fastify';
import {
    createHelpRequest,
    getHelpRequests,
    getHelpRequest,
    addHelpMessage,
    getHelpMessages,
    updateHelpRequestStatus,
    getOpenHelpRequests
} from '../services/policy-help.service.js';
import { getUserContext } from '../middleware/auth.js';

const policyHelpRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * POST /api/v1/policy-help/requests
     * Create a new help request
     */
    fastify.post('/policy-help/requests', async (request, reply) => {
        const { issueDescription, productId, apiId, policyXml, priority } = request.body as any;

        // Get authenticated user
        const { userId, teamId } = getUserContext(request);
        if (!teamId) {
            return reply.code(400).send({ error: 'Team ID required. Set X-Team-Id header.' });
        }

        try {
            const helpRequest = await createHelpRequest({
                userId,
                teamId,
                issueDescription,
                productId,
                apiId,
                policyXml,
                priority
            });

            return { success: true, request: helpRequest };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to create help request');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy-help/requests
     * Get help requests (filtered by user/team or all for super_admin)
     */
    fastify.get('/policy-help/requests', async (request, reply) => {
        const { status, userId, teamId } = request.query as any;

        // TODO: Check user role - if super_admin, show all; otherwise filter by user/team

        try {
            const requests = await getHelpRequests({ status, userId, teamId });
            return { success: true, requests };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get help requests');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy-help/requests/open
     * Get open requests (APIM DEV team view)
     */
    fastify.get('/policy-help/requests/open', async (_request, reply) => {
        // TODO: Check super_admin role

        try {
            const requests = await getOpenHelpRequests();
            return { success: true, requests };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get open requests');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy-help/requests/:id
     * Get a specific help request
     */
    fastify.get('/policy-help/requests/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const helpRequest = await getHelpRequest(id);

            if (!helpRequest) {
                return reply.code(404).send({ error: 'Help request not found' });
            }

            return { success: true, request: helpRequest };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get help request');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy-help/requests/:id/messages
     * Get messages for a help request
     */
    fastify.get('/policy-help/requests/:id/messages', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const messages = await getHelpMessages(id);
            return { success: true, messages };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get messages');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/policy-help/requests/:id/messages
     * Add a message to a help request
     */
    fastify.post('/policy-help/requests/:id/messages', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { message } = request.body as { message: string };

        // Get authenticated user (TODO: check super_admin role)
        const { userId } = getUserContext(request);
        const isApimDev = true; // TODO: Check role from user record

        try {
            const newMessage = await addHelpMessage({
                requestId: id,
                userId,
                message,
                isApimDev
            });

            return { success: true, message: newMessage };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to add message');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * PATCH /api/v1/policy-help/requests/:id
     * Update help request status
     */
    fastify.patch('/policy-help/requests/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { status } = request.body as { status: string };

        // Get authenticated user (requires super_admin role)
        const { userId } = getUserContext(request);

        try {
            await updateHelpRequestStatus(id, status as any, userId);
            return { success: true };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to update status');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default policyHelpRoutes;
