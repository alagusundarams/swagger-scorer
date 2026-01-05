/**
 * Admin Domain Types
 * 
 * Decentralized from the unified entities structure.
 */

export interface GlobalDeployment {
    id: string;
    environment: string;
    state: string;
    gitRepoUrl: string;
    managementMode: string;
    qualityScore: number;
    reconciliationStatus: 'GHOST' | 'RECONCILED' | 'MANUAL';
}

export interface GlobalProduct {
    name: string;
    displayName: string;
    type: string;
    ownerTeamId: string;
    ownerTeamName: string;
    deployments: GlobalDeployment[];
}

export interface GlobalAPI {
    name: string;
    displayName: string;
    path: string;
    deployments: {
        id: string;
        productId: string;
        environment: string;
        qualityScore: number;
        originTeamId: string;
    }[];
}

export interface GlobalInventoryResponse {
    products: GlobalProduct[];
    apis: GlobalAPI[];
}
