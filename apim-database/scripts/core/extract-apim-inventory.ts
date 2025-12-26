/**
 * @fileoverview PART 1: APIM INVENTORY EXTRACTION
 * 
 * PURPOSE:
 * Scans all configured APIM environments (DEV, QA, STAGE) and produces
 * a deduplicated list of unique products for ADO discovery.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

// --- CONFIG LOADER ---
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();

interface ProductIdentity {
    id: string;
    name: string;
    environments: string[];
}

async function main() {
    console.log(`🚀 [PART 1] Starting APIM Inventory Extraction...\n`);

    const azureToken = await AzureService.getAzureAccessToken();
    const uniqueProducts = new Map<string, ProductIdentity>();
    const envConfigs = config.azure?.environments || [];

    for (const env of envConfigs) {
        try {
            console.log(`   🔸 Scanning ${env.name} (${env.instance})...`);
            const azConfig = {
                subscriptionId: env.subscriptionId,
                resourceGroup: env.resourceGroup,
                serviceName: env.instance,
                environment: env.name
            };

            const apimConfig = {
                instance: azConfig.serviceName,
                resourceGroup: azConfig.resourceGroup,
                subscriptionId: azConfig.subscriptionId,
                accessToken: azureToken,
                environment: azConfig.environment
            };

            const response = await AzureService.fetchAPIM<any>(apimConfig, '/products');
            const products = response.value || [];

            for (const p of products) {
                const prodId = p.name;
                const prodName = p.properties.displayName;

                if (!uniqueProducts.has(prodId)) {
                    uniqueProducts.set(prodId, { id: prodId, name: prodName, environments: [env.name] });
                } else {
                    uniqueProducts.get(prodId)!.environments.push(env.name);
                }
            }
        } catch (e: any) {
            console.error(`   ❌ Failed to scan ${env.name}:`, e.message);
        }
    }

    const inventory = Array.from(uniqueProducts.values());
    const outputPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'apim-inventory.json');

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'apim-database', 'scripts', 'data');
    const { mkdirSync } = await import('fs');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    writeFileSync(outputPath, JSON.stringify(inventory, null, 2));

    console.log(`\n✅ Inventory Extraction Complete!`);
    console.log(`📊 Found ${inventory.length} unique products across ${envConfigs.length} environments.`);
    console.log(`💾 Saved to: ${outputPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
