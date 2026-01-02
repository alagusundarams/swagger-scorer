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
import { getAppConfig } from '../config/loader.js';

/**
 * Get APIM configuration for a specific environment
 */
function getApimConfigForEnv(environment: string) {
    const config = getAppConfig();
    const env = config.azure.environments.find(e => e.name.toUpperCase() === environment.toUpperCase());
    if (!env) {
        throw new Error(`Azure environment configuration not found for: ${environment}`);
    }
    return env;
}

/**
 * Create APIM client for a specific subscription
 */
function createApimClient(subscriptionId: string): ApiManagementClient {
    const credential = new DefaultAzureCredential();
    return new ApiManagementClient(credential, subscriptionId);
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
    deploymentConfig: {
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
        const envConfig = getApimConfigForEnv(environment);
        const { subscriptionId, resourceGroup, instance: apimServiceName } = envConfig;

        const client = createApimClient(subscriptionId);

        // Generate environment-specific product ID
        const envProductId = `${productId}-${environment.toLowerCase()}`;

        console.log(`[ARM] Deploying ${productId} to ${environment} (using ${apimServiceName})...`);

        // 1. Create/Update Product in APIM
        const productResult = await client.product.createOrUpdate(
            resourceGroup,
            apimServiceName,
            envProductId,
            {
                displayName: deploymentConfig.displayName,
                description: deploymentConfig.description,
                approvalRequired: false,
                subscriptionRequired: true,
                state: 'published'
            }
        );

        console.log(`[ARM] Product deployed: ${productResult.id}`);

        // 2. Create/Update API if path provided
        if (deploymentConfig.apiPath) {
            const apiId = `${productId}-api-${environment.toLowerCase()}`;

            await (client as any).api.createOrUpdate(
                resourceGroup,
                apimServiceName,
                apiId,
                {
                    displayName: deploymentConfig.displayName,
                    path: deploymentConfig.apiPath,
                    protocols: ['https'],
                    subscriptionRequired: true,
                    // Link to product
                    apiVersion: '1.0'
                }
            );

            console.log(`[ARM] API deployed: ${apiId}`);

            // 3. Apply policy if provided
            if (deploymentConfig.policyXml) {
                await client.apiPolicy.createOrUpdate(
                    resourceGroup,
                    apimServiceName,
                    apiId,
                    'policy',
                    {
                        format: 'xml',
                        value: deploymentConfig.policyXml
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
        const envConfig = getApimConfigForEnv(environment);
        const { subscriptionId, resourceGroup, instance: apimServiceName } = envConfig;

        const client = createApimClient(subscriptionId);
        const envProductId = `${productId}-${environment.toLowerCase()}`;

        const product = await client.product.get(
            resourceGroup,
            apimServiceName,
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
 * Validate ARM configuration for a given environment
 */
export function validateArmConfig(environment: string): {
    valid: boolean;
    missing: string[];
} {
    const missing: string[] = [];
    try {
        const env = getApimConfigForEnv(environment);
        if (!env.subscriptionId) missing.push('subscriptionId');
        if (!env.resourceGroup) missing.push('resourceGroup');
        if (!env.instance) missing.push('instance');
    } catch (e) {
        missing.push('environment-not-found');
    }

    return {
        valid: missing.length === 0,
        missing
    };
}
