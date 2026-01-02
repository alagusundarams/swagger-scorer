
import { FastifyInstance, FastifyPluginOptions } from 'fastify';

/**
 * Auth Routes
 * 
 * Simple mock authentication routes to replace MSW.
 * In a real-world scenario, this would integrate with OIDC (Entra ID).
 */
export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    // POST /api/v1/auth/login
    fastify.post('/login', async (request, _reply) => {
        const body = request.body as any;
        const { email, role: requestedRole } = body;

        // Default mock response structure matching frontend User type
        const user = {
            id: 'u1',
            name: 'Portal User',
            email: email || 'user@company.com',
            role: requestedRole || 'user',
            teams: ['team-general'],
            azureAdObjectId: 'mock-oid-generic',
            leadsTeams: [] as string[],
            defaultTeamId: 'team-general',
            token: 'mock-jwt-token'
        };

        // Determine user persona logic (same as was in MSW)
        if (requestedRole === 'admin' || email?.includes('admin')) {
            user.name = 'Portal Admin';
            user.role = 'admin';
            user.teams = ['team-core', 'team-payments'];
        } else if (requestedRole === 'consumer' || (email && email.includes('consumer'))) {
            user.name = 'Mike Consumer';
            user.role = 'user';
            user.teams = ['team-mobile'];
            user.defaultTeamId = 'team-mobile';
        } else { // Producer
            user.name = 'Sarah Producer';
            user.role = 'user';
            user.teams = ['team-payments', 'team-core'];
            user.leadsTeams = ['team-payments', 'team-core'];
            user.defaultTeamId = 'team-payments';
        }

        return user;
    });

    // GET /api/v1/auth/me
    fastify.get('/me', async (_request, reply) => {
        // Simple unauthorized response for now to trigger login redirect
        return reply.status(401).send({ error: 'Not authenticated', message: 'Session expired' });
    });

    // POST /api/v1/auth/logout
    fastify.post('/logout', async () => {
        return { success: true };
    });
}
