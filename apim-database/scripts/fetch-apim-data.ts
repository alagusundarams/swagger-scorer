/**
 * APIM Data Fetcher
 * 
 * Pulls real data from Azure APIM to understand actual structure
 * 
 * Azure APIM REST API Docs:
 * https://learn.microsoft.com/en-us/rest/api/apimanagement/
 * 
 * Required:
 * - APIM instance name
 * - Resource group
 * - Subscription ID
 * - Access token (az cli or service principal)
 * 
 * Usage:
 * APIM_INSTANCE=your-apim RESOURCE_GROUP=your-rg SUBSCRIPTION_ID=your-sub npx tsx scripts/fetch-apim-data.ts
 * 
 * Or with Azure CLI (recommended):
 * az login
 * npx tsx scripts/fetch-apim-data.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

interface APIMConfig {
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
    environment: string;
    accessToken?: string;
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
 * Fetch data from APIM REST API
 */
async function fetchAPIM<T>(config: APIMConfig, path: string): Promise<{ value: T[] }> {
    const baseUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.instance}`;
    const url = `${baseUrl}${path}?api-version=2022-08-01`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`APIM API error: ${response.status} ${response.statusText}\n${error}`);
    }

    return await response.json();
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Fetching APIM Data...\n');

    // Configuration
    const config: APIMConfig = {
        instance: process.env.APIM_INSTANCE || '',
        resourceGroup: process.env.RESOURCE_GROUP || '',
        subscriptionId: process.env.SUBSCRIPTION_ID || '',
        environment: (process.env.ENV || 'DEV').toUpperCase()
    };

    // Try to get access token from Azure CLI if not provided
    if (!config.accessToken) {
        console.log('📝 Getting access token from Azure CLI...');
        config.accessToken = await getAzureAccessToken();
        console.log('✅ Access token obtained\n');
    }

    if (!config.instance || !config.resourceGroup || !config.subscriptionId) {
        console.error('❌ Missing required configuration:');
        console.error('   APIM_INSTANCE - Your APIM instance name');
        console.error('   RESOURCE_GROUP - Azure resource group name');
        console.error('   SUBSCRIPTION_ID - Azure subscription ID');
        console.error('\nRun: az login');
        console.error('Then set environment variables or use Azure CLI defaults');
        process.exit(1);
    }

    console.log(`📍 APIM Instance: ${config.instance}`);
    console.log(`📍 Resource Group: ${config.resourceGroup}`);
    console.log(`📍 Subscription: ${config.subscriptionId}`);
    console.log(`📍 Tagged Env: ${config.environment}\n`);

    try {
        // Fetch Products
        console.log('📦 Fetching Products...');
        const productsData = await fetchAPIM<Product>(config, '/products');
        console.log(`✅ Found ${productsData.value.length} products\n`);

        // Show first 5 products
        console.log('Top 5 Products:');
        productsData.value.slice(0, 5).forEach((product, i) => {
            console.log(`  ${i + 1}. ${product.properties.displayName} (${product.name})`);
            console.log(`     State: ${product.properties.state}`);
            console.log(`     Subscription Required: ${product.properties.subscriptionRequired}`);
        });

        // Fetch APIs
        console.log('\n📡 Fetching APIs...');
        const apisData = await fetchAPIM<API>(config, '/apis');
        console.log(`✅ Found ${apisData.value.length} APIs\n`);

        // Show first 5 APIs
        console.log('Top 5 APIs:');
        apisData.value.slice(0, 5).forEach((api, i) => {
            console.log(`  ${i + 1}. ${api.properties.displayName} (${api.name})`);
            console.log(`     Path: ${api.properties.path}`);
            console.log(`     Protocols: ${api.properties.protocols.join(', ')}`);
        });

        // Fetch Subscriptions
        console.log('\n🔑 Fetching Subscriptions...');
        const subscriptionsData = await fetchAPIM<Subscription>(config, '/subscriptions');
        console.log(`✅ Found ${subscriptionsData.value.length} subscriptions\n`);

        // Show subscription states
        const subStates = subscriptionsData.value.reduce((acc, sub) => {
            acc[sub.properties.state] = (acc[sub.properties.state] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('Subscription States:');
        Object.entries(subStates).forEach(([state, count]) => {
            console.log(`  - ${state}: ${count}`);
        });

        // Analysis
        console.log('\n📊 Data Analysis:');
        console.log(`  Total Products: ${productsData.value.length}`);
        console.log(`  Total APIs: ${apisData.value.length}`);
        console.log(`  Total Subscriptions: ${subscriptionsData.value.length}`);
        console.log(`  Avg APIs per Product: ${(apisData.value.length / productsData.value.length).toFixed(1)}`);
        console.log(`  Avg Subscriptions per Product: ${(subscriptionsData.value.length / productsData.value.length).toFixed(1)}`);

        // Save to file
        const outputDir = join(process.cwd(), 'data');
        const timestamp = new Date().toISOString().split('T')[0];

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

        // Create data directory if it doesn't exist
        try {
            const { mkdirSync } = await import('fs');
            mkdirSync(outputDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }

        const outputFile = join(outputDir, `apim-data-${config.environment.toLowerCase()}-${timestamp}.json`);
        writeFileSync(outputFile, JSON.stringify(output, null, 2));

        console.log(`\n💾 Data saved to: ${outputFile}`);
        console.log('\n✅ APIM data fetch complete!');

    } catch (error) {
        console.error('\n❌ Error fetching APIM data:', error);
        process.exit(1);
    }
}

main();
