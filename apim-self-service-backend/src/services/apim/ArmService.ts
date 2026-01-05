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
            return null;
        }
    }

    /**
     * Fetches Policy for a Product.
     */
    async getProductPolicy(productId: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/products/${productId}/policies/policy?api-version=2022-08-01`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data.value;
        } catch (e) {
            return null;
        }
    }

    /**
     * Fetches all Named Values from APIM.
     */
    async getNamedValues(): Promise<any[]> {
        const url = `${this.baseUrl}/namedValues?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        return initial.data.value;
    }

    /**
     * Fetches Operations for an API.
     */
    async getApiOperations(apiId: string): Promise<any[]> {
        try {
            // endpoint: /apis/{apiId}/operations
            const url = `${this.baseUrl}/apis/${apiId}/operations?api-version=2022-08-01`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data.value;
        } catch (e) {
            console.error(`Failed to fetch operations for API ${apiId}`, e);
            return [];
        }
    }

    /**
     * Lists Secrets for a Subscription.
     */
    async listSubscriptionSecrets(subscriptionId: string): Promise<any> {
        try {
            // endpoint: /subscriptions/{subscriptionId}/listSecrets
            const url = `${this.baseUrl}/subscriptions/${subscriptionId}/listSecrets?api-version=2022-08-01`;
            const response = await axios.post(url, {}, { headers: this.headers });
            return response.data;
        } catch (e) {
            console.error(`Failed to list secrets for subscription ${subscriptionId}`, e);
            throw e;
        }
    }
}
