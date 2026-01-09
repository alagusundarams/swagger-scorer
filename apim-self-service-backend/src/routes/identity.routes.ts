
import { FastifyInstance } from 'fastify';
import { searchAzureIdentities, searchLocalIdentities, linkIdentity } from '../controllers/IdentityController.js';

export async function identityRoutes(fastify: FastifyInstance) {
    fastify.get('/identity/azure-search', searchAzureIdentities);
    fastify.get('/identity/search', searchLocalIdentities);
    fastify.post('/identity/link', linkIdentity);
}

// Deprecated alias for backward compatibility if needed, using generic inventory prefix
export default identityRoutes;
