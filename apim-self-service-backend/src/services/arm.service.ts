/**
 * @fileoverview ARM Service - Azure Resource Manager Integration
 * 
 * Handles APIM deployments using Azure Managed Identity.
 * CLEAN BOUNDARY: Can be extracted to separate microservice later.
 * 
 * TODO: Replace MI with Service Principal (pod-specific) in production
 */

import { DefaultAzureCredential } from '@azure/identity';
import { ApiManagementClient } from '@azure/arm-apimanagement';

// Configuration from environment
const SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID || '';
const RESOURCE_GROUP = process.env.AZURE_RESOURCE_GROUP || '';
const APIM_SERVICE_NAME = process.env.AZURE_APIM_SERVICE_NAME || '';

// Lazy-initialized client
let apimClient: ApiManagementClient | null = null;

/**
 * Get or create APIM client with MI authentication
 */
function getApimClient(): ApiManagementClient {
    if (!apimClient) {
        const credential = new DefaultAzureCredential();
        apimClient = new ApiManagementClient(credential, SUBSCRIPTION_ID);
    }
    return apimClient;
}

/**
 * Deploy product to target environment
 * 
 * @param productId Product ID to deploy
 * @param environment Target environment (QA, STAGE)
 * @param config Deployment configuration (contract, policies, etc.)
 * @returns Deployment result
 */
export async function deployProductToEnvironment(
    productId: string,
    environment: string,
    config: {
        displayName: string;
        description: string;
        apiPath: string;
        policyXml?: string;
    }
): Promise<{
    success: boolean;
    deploymentId: string;
    error?: string;
}> {
    try {
        const client = getApimClient();

        // Generate environment-specific product ID
        const envProductId = `${productId}-${environment.toLowerCase()}`;

        console.log(`[ARM] Deploying ${productId} to ${environment}...`);

        // 1. Create/Update Product in APIM
        const productResult = await client.product.createOrUpdate(
            RESOURCE_GROUP,
            APIM_SERVICE_NAME,
            envProductId,
            {
                displayName: config.displayName,
                description: config.description,
                approvalRequired: false,
                subscriptionRequired: true,
                state: 'published'
            }
        );

        console.log(`[ARM] Product deployed: ${productResult.id}`);

        // 2. Create/Update API if path provided
        if (config.apiPath) {
            const apiId = `${productId}-api-${environment.toLowerCase()}`;

            await (client as any).api.createOrUpdate(
                RESOURCE_GROUP,
                APIM_SERVICE_NAME,
                apiId,
                {
                    displayName: config.displayName,
                    path: config.apiPath,
                    protocols: ['https'],
                    subscriptionRequired: true,
                    // Link to product
                    apiVersion: '1.0'
                }
            );

            console.log(`[ARM] API deployed: ${apiId}`);

            // 3. Apply policy if provided
            if (config.policyXml) {
                await client.apiPolicy.createOrUpdate(
                    RESOURCE_GROUP,
                    APIM_SERVICE_NAME,
                    apiId,
                    'policy',
                    {
                        format: 'xml',
                        value: config.policyXml
                    }
                );

                console.log(`[ARM] Policy applied to ${apiId}`);
            }
        }

        return {
            success: true,
            deploymentId: `dep-${Date.now()}-${environment}`
        };

    } catch (error: any) {
        console.error(`[ARM] Deployment failed:`, error);

        return {
            success: false,
            deploymentId: '',
            error: error.message || 'ARM deployment failed'
        };
    }
}

/**
 * Get deployment status from APIM
 */
export async function getDeploymentStatus(
    productId: string,
    environment: string
): Promise<{
    deployed: boolean;
    lastUpdated?: Date;
}> {
    try {
        const client = getApimClient();
        const envProductId = `${productId}-${environment.toLowerCase()}`;

        const product = await client.product.get(
            RESOURCE_GROUP,
            APIM_SERVICE_NAME,
            envProductId
        );

        return {
            deployed: product.state === 'published',
            lastUpdated: new Date() // APIM doesn't provide this, use current time
        };

    } catch (error: any) {
        if (error.code === 'ResourceNotFound') {
            return { deployed: false };
        }
        throw error;
    }
}

/**
 * Validate ARM configuration
 */
export function validateArmConfig(): {
    valid: boolean;
    missing: string[];
} {
    const missing: string[] = [];

    if (!SUBSCRIPTION_ID) missing.push('AZURE_SUBSCRIPTION_ID');
    if (!RESOURCE_GROUP) missing.push('AZURE_RESOURCE_GROUP');
    if (!APIM_SERVICE_NAME) missing.push('AZURE_APIM_SERVICE_NAME');

    return {
        valid: missing.length === 0,
        missing
    };
}
