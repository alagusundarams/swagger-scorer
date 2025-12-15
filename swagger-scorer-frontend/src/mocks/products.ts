// Mock products and APIs
export interface Operation {
    id: string;
    name: string;
    displayName: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    urlTemplate: string;
    description: string;
}

export interface API {
    id: string;
    name: string;
    displayName: string;
    description: string;
    path: string;
    operations: Operation[];
    qualityScore?: number;
}

export interface Product {
    id: string;
    name: string;
    displayName: string;
    version: string;
    description: string;
    state: 'published' | 'notPublished';
    ownerTeamId: string;
    apis: API[];
    subscriberCount?: number;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
}

export const mockProducts: Product[] = [
    // Products exposed by Platform Team
    {
        id: 'product-user-service',
        name: 'user-service-api',
        displayName: 'User Service API',
        version: 'v1.0',
        description: 'Manage user accounts, profiles, and authentication',
        state: 'published',
        ownerTeamId: 'team-platform',
        subscriberCount: 15,
        qualityScore: 87,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-03-20T14:30:00Z',
        apis: [
            {
                id: 'api-user-management',
                name: 'user-management',
                displayName: 'User Management API',
                description: 'CRUD operations for user accounts',
                path: '/users',
                qualityScore: 85,
                operations: [
                    {
                        id: 'op-list-users',
                        name: 'list-users',
                        displayName: 'List Users',
                        method: 'GET',
                        urlTemplate: '/users',
                        description: 'Get a list of all users'
                    },
                    {
                        id: 'op-get-user',
                        name: 'get-user',
                        displayName: 'Get User',
                        method: 'GET',
                        urlTemplate: '/users/{userId}',
                        description: 'Get a specific user by ID'
                    },
                    {
                        id: 'op-create-user',
                        name: 'create-user',
                        displayName: 'Create User',
                        method: 'POST',
                        urlTemplate: '/users',
                        description: 'Create a new user account'
                    },
                    {
                        id: 'op-update-user',
                        name: 'update-user',
                        displayName: 'Update User',
                        method: 'PUT',
                        urlTemplate: '/users/{userId}',
                        description: 'Update user information'
                    },
                    {
                        id: 'op-delete-user',
                        name: 'delete-user',
                        displayName: 'Delete User',
                        method: 'DELETE',
                        urlTemplate: '/users/{userId}',
                        description: 'Delete a user account'
                    }
                ]
            },
            {
                id: 'api-authentication',
                name: 'authentication',
                displayName: 'Authentication API',
                description: 'User authentication and session management',
                path: '/auth',
                qualityScore: 90,
                operations: [
                    {
                        id: 'op-login',
                        name: 'login',
                        displayName: 'Login',
                        method: 'POST',
                        urlTemplate: '/auth/login',
                        description: 'Authenticate user and create session'
                    },
                    {
                        id: 'op-logout',
                        name: 'logout',
                        displayName: 'Logout',
                        method: 'POST',
                        urlTemplate: '/auth/logout',
                        description: 'End user session'
                    },
                    {
                        id: 'op-refresh-token',
                        name: 'refresh-token',
                        displayName: 'Refresh Token',
                        method: 'POST',
                        urlTemplate: '/auth/refresh',
                        description: 'Refresh authentication token'
                    }
                ]
            },
            {
                id: 'api-user-profiles',
                name: 'user-profiles',
                displayName: 'User Profiles API',
                description: 'Manage user profile information and preferences',
                path: '/profiles',
                qualityScore: 78,
                operations: [
                    {
                        id: 'op-get-profile',
                        name: 'get-profile',
                        displayName: 'Get Profile',
                        method: 'GET',
                        urlTemplate: '/profiles/{userId}',
                        description: 'Get user profile details'
                    },
                    {
                        id: 'op-update-profile',
                        name: 'update-profile',
                        displayName: 'Update Profile',
                        method: 'PATCH',
                        urlTemplate: '/profiles/{userId}',
                        description: 'Update user profile information'
                    }
                ]
            }
        ]
    },
    {
        id: 'product-order-api',
        name: 'order-api',
        displayName: 'Order API',
        version: 'v2.0',
        description: 'Order processing and management',
        state: 'published',
        ownerTeamId: 'team-platform',
        subscriberCount: 8,
        qualityScore: 92,
        createdAt: '2024-02-01T09:00:00Z',
        updatedAt: '2024-03-15T11:20:00Z',
        apis: [
            {
                id: 'api-order-management',
                name: 'order-management',
                displayName: 'Order Management API',
                description: 'Create and manage orders',
                path: '/orders',
                qualityScore: 92,
                operations: [
                    {
                        id: 'op-create-order',
                        name: 'create-order',
                        displayName: 'Create Order',
                        method: 'POST',
                        urlTemplate: '/orders',
                        description: 'Create a new order'
                    },
                    {
                        id: 'op-get-order',
                        name: 'get-order',
                        displayName: 'Get Order',
                        method: 'GET',
                        urlTemplate: '/orders/{orderId}',
                        description: 'Get order details'
                    }
                ]
            }
        ]
    },
    // Products exposed by Data Team
    {
        id: 'product-analytics-api',
        name: 'analytics-api',
        displayName: 'Analytics API',
        version: 'v1.5',
        description: 'Business analytics and reporting data',
        state: 'published',
        ownerTeamId: 'team-data',
        subscriberCount: 12,
        qualityScore: 85,
        createdAt: '2024-01-20T08:00:00Z',
        updatedAt: '2024-03-18T16:45:00Z',
        apis: [
            {
                id: 'api-reports',
                name: 'reports',
                displayName: 'Reports API',
                description: 'Generate and retrieve reports',
                path: '/reports',
                qualityScore: 78,
                operations: [
                    {
                        id: 'op-generate-report',
                        name: 'generate-report',
                        displayName: 'Generate Report',
                        method: 'POST',
                        urlTemplate: '/reports',
                        description: 'Generate a new report'
                    }
                ]
            }
        ]
    },
    // External products (for subscriptions)
    {
        id: 'product-payment-gateway',
        name: 'payment-gateway-api',
        displayName: 'Payment Gateway API',
        version: 'v2.1',
        description: 'Process payments and manage transactions',
        state: 'published',
        ownerTeamId: 'team-external-1',
        createdAt: '2023-11-10T10:00:00Z',
        updatedAt: '2024-03-10T09:30:00Z',
        apis: [
            {
                id: 'api-payment-processing',
                name: 'payment-processing',
                displayName: 'Payment Processing API',
                description: 'Process credit card and ACH payments',
                path: '/payments',
                qualityScore: 88,
                operations: [
                    {
                        id: 'op-process-payment',
                        name: 'process-payment',
                        displayName: 'Process Payment',
                        method: 'POST',
                        urlTemplate: '/payments',
                        description: 'Process a payment transaction'
                    }
                ]
            }
        ]
    },
    {
        id: 'product-email-service',
        name: 'email-service-api',
        displayName: 'Email Service API',
        version: 'v1.0',
        description: 'Send transactional and marketing emails',
        state: 'published',
        ownerTeamId: 'team-external-2',
        createdAt: '2023-12-05T14:00:00Z',
        updatedAt: '2024-02-28T10:15:00Z',
        apis: [
            {
                id: 'api-email-sending',
                name: 'email-sending',
                displayName: 'Email Sending API',
                description: 'Send emails via API',
                path: '/emails',
                qualityScore: 81,
                operations: [
                    {
                        id: 'op-send-email',
                        name: 'send-email',
                        displayName: 'Send Email',
                        method: 'POST',
                        urlTemplate: '/emails/send',
                        description: 'Send a transactional email'
                    }
                ]
            }
        ]
    }
];
