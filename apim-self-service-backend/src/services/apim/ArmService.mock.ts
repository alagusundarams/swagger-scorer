/**
 * @fileoverview ArmService Mock
 */

export class ArmServiceMock {
    async getProducts(): Promise<any[]> {
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

    async getApis(): Promise<any[]> {
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

    async getApiPolicy(apiId: string): Promise<string | null> {
        console.log(`☁️ [MOCK_MODE] Fetching Policy for API ${apiId}...`);
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
}
