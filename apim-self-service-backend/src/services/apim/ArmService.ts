/**
 * @fileoverview APIM ARM Service
 * 
 * Manages interactions with Azure API Management via ARM REST APIs.
 * 
 * SCOPE:
 * - Fetching Products / APIs / Policies
 * - Fetching Metrics (Future)
 * - Fetching Keys (Secrets)
 */

import axios from 'axios';

interface ArmConfig {
    subscriptionId: string;
    resourceGroup: string;
    serviceName: string;
    accessToken: string;
}

export class ArmService {
    private baseUrl: string;
    private config: ArmConfig;

    constructor(config: ArmConfig) {
        this.config = config;
        this.baseUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.serviceName}`;
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Fetches all Products from APIM.
     */
    async getProducts(): Promise<any[]> {
        const url = `${this.baseUrl}/products?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        // TODO: Handle Pagination (nextLink)
        return initial.data.value;
    }

    /**
     * Fetches all APIs from APIM.
     */
    async getApis(): Promise<any[]> {
        const url = `${this.baseUrl}/apis?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        return initial.data.value;
    }

    /**
     * Fetches Policy for an API.
     */
    async getApiPolicy(apiId: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/apis/${apiId}/policies/policy?api-version=2022-08-01`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data.value; // The raw XML string
        } catch (e) {
            // Policy might not exist
            return null;
        }
    }
}
