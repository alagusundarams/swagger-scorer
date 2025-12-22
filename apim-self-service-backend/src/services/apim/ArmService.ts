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
        if (process.env.USE_BACKEND_MOCKS === 'true') {
            console.log('☁️ [MOCK_MODE] Fetching Products from Fake Azure...');
            return [
                {
                    id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim/products/prod-legacy',
                    name: 'prod-legacy',
                    properties: {
                        displayName: 'Legacy Order Processing API',
                        description: 'Manually created legacy API.',
                        state: 'published'
                    }
                },
                {
                    id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim/products/prod-payment-v2',
                    name: 'prod-payment-v2',
                    properties: {
                        displayName: 'Payment Gateway v2',
                        description: 'Modern payment API managed by Terraform.',
                        state: 'published'
                    }
                }
            ];
        }

        const url = `${this.baseUrl}/products?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        // TODO: Handle Pagination (nextLink)
        return initial.data.value;
    }

    /**
     * Fetches all APIs from APIM.
     */
    async getApis(): Promise<any[]> {
        if (process.env.USE_BACKEND_MOCKS === 'true') {
            console.log('☁️ [MOCK_MODE] Fetching APIs from Fake Azure...');
            return [
                {
                    id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim/apis/api-legacy-01',
                    name: 'api-legacy-01',
                    properties: {
                        displayName: 'Order Processing Endpoint',
                        path: '/orders/v1'
                    }
                },
                {
                    id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim/apis/api-payment-v2',
                    name: 'api-payment-v2',
                    properties: {
                        displayName: 'Payment API',
                        path: '/payments/v2'
                    }
                }
            ];
        }

        const url = `${this.baseUrl}/apis?api-version=2022-08-01`;
        const initial = await axios.get(url, { headers: this.headers });
        return initial.data.value;
    }

    /**
     * Fetches Policy for an API.
     */
    async getApiPolicy(apiId: string): Promise<string | null> {
        if (process.env.USE_BACKEND_MOCKS === 'true') {
            // Return complex legacy XML for legacy API, clean XML for modern
            if (apiId.includes('legacy')) {
                return `
<policies>
    <inbound>
        <base />
        <rate-limit calls="50" renewal-period="60" />
        <set-header name="X-Legacy-Mock" exists-action="override"><value>true</value></set-header>
    </inbound>
    <backend><base /></backend>
    <outbound><base /></outbound>
    <on-error><base /></on-error>
</policies>`;
            }
            return `<policies><inbound><base /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>`;
        }

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
