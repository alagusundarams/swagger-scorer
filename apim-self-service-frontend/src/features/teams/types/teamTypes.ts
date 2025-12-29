/**
 * Team Specific Types
 * 
 * Decentralized from global entities.ts
 */

export interface Team {
    id: string;
    name: string;
    azureAdGroupId: string;
    type: 'producer' | 'consumer' | 'both';
    description: string;
    memberCount: number;
    additionalAdGroups?: string[];
    adGroupMapping?: {
        DEV?: string;
        QA?: string;
        STAGE?: string;
        PROD?: string;
    };
}
