// Mock teams data
export interface Team {
    id: string;
    name: string;
    azureAdGroupId: string;
    type: 'producer' | 'consumer' | 'both';
    description: string;
    memberCount: number;
}

export const mockTeams: Team[] = [
    {
        id: 'team-platform',
        name: 'Platform Team',
        azureAdGroupId: 'ad-group-platform-123',
        type: 'both',
        description: 'Platform engineering and infrastructure',
        memberCount: 12
    },
    {
        id: 'team-payments',
        name: 'Payments Team',
        azureAdGroupId: 'ad-group-payments-456',
        type: 'consumer',
        description: 'Payment processing and billing',
        memberCount: 8
    },
    {
        id: 'team-data',
        name: 'Data Team',
        azureAdGroupId: 'ad-group-data-789',
        type: 'producer',
        description: 'Data analytics and reporting',
        memberCount: 15
    },
    {
        id: 'team-mobile',
        name: 'Mobile Team',
        azureAdGroupId: 'ad-group-mobile-101',
        type: 'consumer',
        description: 'iOS and Android applications',
        memberCount: 10
    },
    {
        id: 'team-analytics',
        name: 'Analytics Team',
        azureAdGroupId: 'ad-group-analytics-202',
        type: 'both',
        description: 'Business intelligence and analytics',
        memberCount: 6
    }
];
