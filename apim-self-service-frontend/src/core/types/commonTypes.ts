/**
 * Common Shell Types
 * 
 * Types that are truly global and shared across multiple features.
 */

export type Environment = 'ALL' | 'DEV' | 'QA' | 'STAGE' | 'PROD';

export interface User {
    id: string;
    email: string;
    name: string;
    azureAdObjectId: string;
    teams: string[]; // Team IDs
    leadsTeams: string[]; // Team IDs where user is a Lead/Architect
    defaultTeamId: string;
    role: 'user' | 'admin';
    username?: string; // Compatibility for MSAL
    adGroups?: string[]; // Groups the user belongs to (Mock for RBAC)
}
