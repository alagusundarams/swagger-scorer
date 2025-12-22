/**
 * APIM Data Fetcher
 * 
 * Pulls real data from Azure APIM to understand actual structure
 * Supporting parallel fetch for DEV, QA, and STAGE environments.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface APIMConfig {
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
    environment: string;
    accessToken?: string;
}

interface EnvConfig {
    name: string;
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
}

interface Product {
    id: string;
    name: string;
    properties: {
        displayName: string;
        description?: string;
        state: string;
        subscriptionRequired: boolean;
        approvalRequired: boolean;
    };
    gitInfo?: {
        repoUrl: string;
        lastCommit: string;
        lastCommitDate: string;
    };
    pipelineInfo?: {
        name: string;
        lastRunStatus: string;
        lastRunDate: string;
        url: string;
    };
}

interface API {
    id: string;
    name: string;
    properties: {
        displayName: string;
        description?: string;
        path: string;
        serviceUrl?: string;
        protocols: string[];
        subscriptionRequired: boolean;
    };
}

interface Subscription {
    id: string;
    name: string;
    properties: {
        scope: string;
        displayName: string;
        state: string;
        createdDate: string;
    };
}

/**
 * Get Azure access token using Azure CLI
 */
async function getAzureAccessToken(): Promise<string> {
    const { execSync } = await import('child_process');
    try {
        const token = execSync('az account get-access-token --resource https://management.azure.com --query accessToken -o tsv', {
            encoding: 'utf-8'
        }).trim();
        return token;
    } catch (error) {
        throw new Error('Failed to get Azure access token. Make sure Azure CLI is installed and you are logged in (az login)');
    }
}

/**
 * Fetch data from APIM REST API with pagination support
 */
async function fetchAPIM<T>(config: APIMConfig, path: string): Promise<{ value: T[] }> {
    const results: T[] = [];
    const baseUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.instance}`;
    let nextLink: string | null = `${baseUrl}${path}?api-version=2022-08-01`;

    while (nextLink) {
        const response = await fetch(nextLink, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`APIM API error: ${response.status} ${response.statusText}\n${error}`);
        }

        const data = await response.json() as { value: T[], nextLink?: string };
        results.push(...data.value);
        nextLink = data.nextLink || null;
    }

    return { value: results };
}

/**
 * Fetch a single environment
 */
async function fetchEnvironment(config: APIMConfig) {
    console.log(`📍 [${config.environment}] Starting Fetch...`);

    try {
        const productsData = await fetchAPIM<Product>(config, '/products');
        const apisData = await fetchAPIM<API>(config, '/apis');
        const subscriptionsData = await fetchAPIM<Subscription>(config, '/subscriptions');

        console.log(`✅ [${config.environment}] Found ${productsData.value.length} Products, ${apisData.value.length} APIs.`);

        // Enrichment logic for Azure Repos & Pipelines
        productsData.value.forEach((product, i) => {
            // Placeholder: In production, this would use az repos list or ADO REST API
            product.gitInfo = {
                repoUrl: `https://dev.azure.com/org/project/_git/${product.name}`,
                lastCommit: '33e66c1', // Mocking last commit from master
                lastCommitDate: new Date().toISOString()
            };

            product.pipelineInfo = {
                name: `${product.properties.displayName} Deploy`,
                lastRunStatus: i % 2 === 0 ? 'succeeded' : 'failed',
                lastRunDate: new Date().toISOString(),
                url: `https://dev.azure.com/org/project/_build?definitionId=${i + 100}`
            };
        });

        const output = {
            fetchedAt: new Date().toISOString(),
            instance: config.instance,
            environment: config.environment,
            summary: {
                totalProducts: productsData.value.length,
                totalAPIs: apisData.value.length,
                totalSubscriptions: subscriptionsData.value.length
            },
            products: productsData.value,
            apis: apisData.value,
            subscriptions: subscriptionsData.value
        };

        const outputDir = join(process.cwd(), 'data');
        mkdirSync(outputDir, { recursive: true });
        const timestamp = new Date().toISOString().split('T')[0];
        const outputFile = join(outputDir, `apim-data-${config.environment.toLowerCase()}-${timestamp}.json`);

        writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`💾 [${config.environment}] Saved to: ${outputFile}`);

        return outputFile;
    } catch (error) {
        console.error(`❌ [${config.environment}] Failed:`, error);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Multi-Environment APIM Data Extraction (Azure Repos Focus)...\n');

    try {
        const accessToken = await getAzureAccessToken();
        console.log('✅ Azure Access Token acquired.\n');

        const envsToFetch: EnvConfig[] = [
            {
                name: 'DEV',
                instance: process.env.DEV_APIM_INSTANCE || '',
                resourceGroup: process.env.DEV_RESOURCE_GROUP || '',
                subscriptionId: process.env.DEV_SUBSCRIPTION_ID || ''
            },
            {
                name: 'QA',
                instance: process.env.QA_APIM_INSTANCE || '',
                resourceGroup: process.env.QA_RESOURCE_GROUP || '',
                subscriptionId: process.env.QA_SUBSCRIPTION_ID || ''
            },
            {
                name: 'STAGE',
                instance: process.env.STAGE_APIM_INSTANCE || '',
                resourceGroup: process.env.STAGE_RESOURCE_GROUP || '',
                subscriptionId: process.env.STAGE_SUBSCRIPTION_ID || ''
            }
        ].filter(e => e.instance && e.resourceGroup && e.subscriptionId);

        if (envsToFetch.length === 0) {
            console.error('❌ Error: No environments configured. Please set DEV_APIM_INSTANCE, etc.');
            process.exit(1);
        }

        await Promise.all(envsToFetch.map(env => fetchEnvironment({
            ...env,
            environment: env.name,
            accessToken
        })));

        console.log('\n✨ All parallel extraction tasks completed!');
    } catch (error) {
        console.error('\n❌ extraction failed:', error);
        process.exit(1);
    }
}

main();
