// Mock user data
export interface User {
    id: string;
    email: string;
    name: string;
    azureAdObjectId: string;
    teams: string[]; // Team IDs
    defaultTeamId: string;
}

export const mockUser: User = {
    id: 'user-123',
    email: 'john.doe@company.com',
    name: 'John Doe',
    azureAdObjectId: 'azure-ad-user-123',
    teams: ['team-platform', 'team-payments', 'team-data'],
    defaultTeamId: 'team-platform'
};
