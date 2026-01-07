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

    /**
     * Lists all Subscriptions for a Product.
     */
    async listProductSubscriptions(productId: string): Promise<any[]> {
        try {
            // endpoint: /products/{productId}/subscriptions
            const url = `${this.baseUrl}/products/${productId}/subscriptions?api-version=2022-08-01`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data.value || [];
        } catch (e) {
            console.error(`Failed to list subscriptions for product ${productId}`, e);
            throw e;
        }
    }

    /**
     * Fetches all Backends from APIM.
     */
    async getBackends(): Promise<any[]> {
        const url = `${this.baseUrl}/backends?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        return initial.data.value;
    }
    /**
     * Creates or Updates a Resource via PUT.
     */
    async putResource(relativePath: string, body: any): Promise<any> {
        const url = `${this.baseUrl}/${relativePath}?api-version=2022-08-01`;
        try {
            const response = await axios.put(url, body, { headers: this.headers });
            // Extract Etag from header if available, otherwise just return data
            const etag = response.headers['etag'] || response.data.etag;
            return { ...response.data, etag };
        } catch (e: any) {
            console.error(`[ARM] PUT Failed for ${relativePath}:`, e.response?.data || e.message);
            throw new Error(`ARM PUT Failed: ${JSON.stringify(e.response?.data?.error || e.message)}`);
        }
    }

    /**
     * Gets a Resource (Generic). Useful for Snapshots.
     */
    async getResource(relativePath: string): Promise<any> {
        const url = `${this.baseUrl}/${relativePath}?api-version=2022-08-01`;
        try {
            const response = await axios.get(url, { headers: this.headers });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) return null;
            throw new Error(`ARM GET Failed: ${e.message}`);
        }
    }

    /**
     * Deletes a Resource via DELETE.
     */
    async deleteResource(relativePath: string): Promise<void> {
        const url = `${this.baseUrl}/${relativePath}?api-version=2022-08-01`;
        try {
            await axios.delete(url, { headers: { ...this.headers, 'If-Match': '*' } }); // Force delete even if etag mismatch
            console.log(`[ARM] DELETE Success for ${relativePath}`);
        } catch (e: any) {
            // Ignore 404
            if (e.response?.status === 404) {
                console.warn(`[ARM] DELETE Ignored (Not Found) for ${relativePath}`);
                return;
            }
            console.error(`[ARM] DELETE Failed for ${relativePath}:`, e.response?.data || e.message);
            throw new Error(`ARM DELETE Failed: ${JSON.stringify(e.response?.data?.error || e.message)}`);
        }
    }
}
