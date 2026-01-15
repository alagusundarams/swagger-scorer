import { http, HttpResponse } from 'msw';

export const handlers = [
    // Auth Login - Mock handler to return user based on role
    http.post('/api/v1/auth/login', async ({ request }) => {
        const body = await request.json() as { email?: string; role?: string };
        const role = body.role || 'user';

        // Return appropriate user based on role
        if (role === 'admin') {
            return HttpResponse.json({
                data: {
                    id: 'alex-admin',
                    name: 'Alex (Platform Admin)',
                    email: 'admin@apim.portal',
                    role: 'admin',
                    azureAdObjectId: 'mock-oid-alex',
                    teams: ['team-platform'],
                    leadsTeams: [],
                    defaultTeamId: 'team-platform'
                }
            });
        } else if (role === 'consumer') {
            return HttpResponse.json({
                data: {
                    id: 'mike-consumer',
                    name: 'Mike (Core Systems)',
                    email: 'mike@core.sys',
                    role: 'user',
                    azureAdObjectId: 'mock-oid-mike',
                    teams: ['team-core'],
                    leadsTeams: [],
                    defaultTeamId: 'team-core'
                }
            });
        } else if (role === 'producer') {
            return HttpResponse.json({
                data: {
                    id: 'sarah-producer',
                    name: 'Sarah (Payments)',
                    email: 'sarah@payments.dev',
                    role: 'user',
                    azureAdObjectId: 'mock-oid-sarah',
                    teams: ['team-payments'],
                    leadsTeams: [],
                    defaultTeamId: 'team-payments'
                }
            });
        } else {
            // Default: Team Lead (Taylor)
            return HttpResponse.json({
                data: {
                    id: 'taylor-lead',
                    name: 'Taylor (Platform Lead)',
                    email: 'taylor@platform.dev',
                    role: 'user',
                    azureAdObjectId: 'mock-oid-taylor',
                    teams: ['team-platform'],
                    leadsTeams: ['team-platform'],
                    defaultTeamId: 'team-platform'
                }
            });
        }
    }),
];
