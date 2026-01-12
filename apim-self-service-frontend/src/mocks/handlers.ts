import { http, HttpResponse } from 'msw';
import { mockTeams, mockProducts } from '../test-utils/mockData';

export const handlers = [
    // Teams
    http.get('/api/v1/teams', () => {
        return HttpResponse.json(mockTeams);
    }),

    // Environments
    http.get('/api/v1/environments', () => {
        return HttpResponse.json(['DEV', 'QA', 'PROD']);
    }),

    // Products
    http.get('/api/v1/products', ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page');
        const limit = url.searchParams.get('limit');

        if (page && limit) {
            return HttpResponse.json({
                products: mockProducts,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: mockProducts.length,
                    totalPages: 1
                }
            });
        }
        return HttpResponse.json(mockProducts);
    }),

    // Global Inventory (Admin Governance)
    http.get('/api/v1/admin/global-inventory', () => {
        return HttpResponse.json({
            products: [
                ...mockProducts,
                {
                    id: 'prod-orphan-1',
                    name: 'legacy-payment-service',
                    displayName: 'Legacy Payment Service',
                    ownerTeamId: null,
                    qualityScore: 42,
                    state: 'published',
                    environment: 'PROD',
                    detectedAnomalies: ['UNOWNED', 'LEGACY_XML']
                }
            ],
            apis: [
                { id: 'api-1', displayName: 'Payment API', qualityScore: 90 }
            ]
        });
    }),

    // Azure App Registration Search
    http.get('/api/v1/identity/azure-search', () => {
        return HttpResponse.json([
            { clientId: '00000000-0000-0000-0000-000000000001', displayName: 'Customer-Profile-Identity', appIdUri: 'api://customer-profile' },
            { clientId: '2222-3333', displayName: 'Payment-Gate-Identity', appIdUri: 'api://payment-gateway' }
        ]);
    }),

    // Approvals
    http.get('/api/v1/approvals', () => {
        return HttpResponse.json([
            {
                id: 'req-1',
                type: 'SUBSCRIPTION',
                status: 'PENDING',
                requester: {
                    name: 'Connor Consumer',
                    email: 'connor@mobile.dev',
                    teamName: 'Mobile Team',
                    teamId: 'team-mobile'
                },
                approverTeamId: 'team-platform',
                submittedAt: new Date().toISOString(),
                details: { targetName: 'User API', environment: 'PROD' }
            }
        ]);
    }),

    // Catch-all for other products/details to prevent 500s
    http.get('/api/v1/products/:id', ({ params }) => {
        const product = mockProducts.find(p => p.id === params.id) || mockProducts[0];
        return HttpResponse.json(product);
    }),

    http.get('/api/v1/products/:id/subscriptions', () => {
        return HttpResponse.json([]);
    }),

    // Policy Templates
    http.get('/api/v1/policy/templates', () => {
        return HttpResponse.json({
            templates: [
                {
                    id: 'rate-limit',
                    name: 'Rate Limit',
                    category: 'Traffic',
                    intent: 'Prevent Abuse',
                    description: 'Limits the number of calls allowed in a time period.',
                    defaultSection: 'inbound',
                    inputs: [
                        { name: 'calls', label: 'Number of Calls', type: 'number', default: '100', required: true },
                        { name: 'period', label: 'Period (seconds)', type: 'number', default: '60', required: true }
                    ],
                    xmlTemplate: '<rate-limit calls="{{calls}}" renewal-period="{{period}}" />'
                },
                {
                    id: 'mock-response',
                    name: 'Mock Response',
                    category: 'Mocking',
                    intent: 'Test API',
                    description: 'Returns a static response for testing.',
                    defaultSection: 'inbound',
                    inputs: [
                        { name: 'code', label: 'Status Code', type: 'number', default: '200', required: true },
                        { name: 'body', label: 'Response Body', type: 'textarea', default: '{"message": "Mock"}', required: true }
                    ],
                    xmlTemplate: '<mock-response status-code="{{code}}" content-type="application/json" />'
                }
            ]
        });
    }),

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
