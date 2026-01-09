
import { FastifyRequest, FastifyReply } from 'fastify';
import { AzureService } from '../services/core/AzureService.js';
import { searchApps, linkAppRegistration } from '../services/identity/AppsService.js';

/**
 * Search Azure AD App Registrations (Live)
 */
export async function searchAzureIdentities(req: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) {
    const { q } = req.query;
    if (!q || q.length < 3) {
        return reply.code(400).send({ message: 'Query must be at least 3 characters' });
    }

    try {
        const results = await AzureService.searchAppRegistrations(q);
        return reply.send(results);
    } catch (err: any) {
        req.log.error(err);
        return reply.code(500).send({ message: 'Failed to search Azure identities' });
    }
}

/**
 * Search Local DB App Registrations
 */
export async function searchLocalIdentities(req: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) {
    const { q } = req.query;
    try {
        const results = await searchApps(q || '');
        return reply.send(results);
    } catch (err: any) {
        req.log.error(err);
        return reply.code(500).send({ message: 'Failed to search local identities' });
    }
}

/**
 * Link an App Registration to a Product/Environment
 * This is the "Manual Fallback" action
 */
export async function linkIdentity(req: FastifyRequest<{
    Body: {
        productId: string;
        environment: string;
        clientId: string;
        displayName: string
    }
}>, reply: FastifyReply) {
    const { productId, environment, clientId, displayName } = req.body;
    const userId = (req as any).user?.id || 'system-user'; // Assuming auth middleware populates this

    // 1. Basic Validation
    if (!productId || !environment || !clientId) {
        return reply.code(400).send({ message: 'Missing required fields: productId, environment, clientId' });
    }

    try {
        // 2. Call Service to Perform Logic (Validate in Azure -> Persist -> Audit)
        const result = await linkAppRegistration(productId, environment, { clientId, displayName }, userId);
        return reply.code(201).send(result);

    } catch (err: any) {
        req.log.error(err);
        if (err.message.includes('not found in Azure')) {
            return reply.code(404).send({ message: err.message });
        }
        return reply.code(500).send({ message: err.message || 'Failed to link identity' });
    }
}
