/**
 * @fileoverview PART 1: APIM INVENTORY & METADATA EXTRACTION
 * 
 * PURPOSE:
 * 1. Scans all configured APIM environments (DEV, QA, STAGE).
 * 2. Deduplicates products for ADO discovery.
 * 3. Extracts Metadata: Named Values and potential Client IDs from Policy XML.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';
import fetch from 'node-fetch';

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

interface MetadataStore {
    namedValues: Record<string, any[]>; // env -> nv[]
    appIds: Record<string, string[]>;   // env -> unique_guids[]
}

/**
 * Regex-based forensics to find Client IDs in XML
 */
function extractClientIdsFromPolicy(xml: string): string[] {
    if (!xml) return [];
    const ids = new Set<string>();

    const addIfGuidOrNv = (val: string) => {
        const clean = val.replace(/[{}]/g, '').trim();
        if (clean.length > 0 && (clean.includes('-') || /^[a-zA-Z0-9-_]+$/.test(clean))) {
            ids.add(clean.toLowerCase());
        }
    };

    // 1. GUIDs
    const guidMatches = xml.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi);
    if (guidMatches) guidMatches.forEach(m => ids.add(m.toLowerCase()));

    // 2. Attributes
    const attrMatches = xml.match(/(audience|application-id|client-id|azp|aud)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(m => {
            const val = m.split(/["']/)[1];
            addIfGuidOrNv(val);
        });
    }

    return Array.from(ids).filter(id => /^[0-9a-f]{8}-/i.test(id)); // Only return GUIDs for App Reg
}

async function main() {
    console.log(`🚀 [PART 1] Starting APIM Inventory & Metadata Extraction...\n`);

    const azureToken = await AzureService.getAzureAccessToken();
    const uniqueProducts = new Map<string, ProductIdentity>();
    const metadata: MetadataStore = { namedValues: {}, appIds: {} };

    const envConfigs = config.azure?.environments || [];

    for (const env of envConfigs) {
        try {
            console.log(`\n   🔸 Scanning ${env.name} (${env.instance})...`);
            const apimConfig = {
                instance: env.instance,
                resourceGroup: env.resourceGroup,
                subscriptionId: env.subscriptionId,
                accessToken: azureToken,
                environment: env.name
            };

            // 1. Products
            const prodRes = await AzureService.fetchAPIM<any>(apimConfig, '/products');
            for (const p of prodRes.value || []) {
                const prodId = p.name;
                const prodName = p.properties.displayName;
                if (!uniqueProducts.has(prodId)) {
                    uniqueProducts.set(prodId, { id: prodId, name: prodName, environments: [env.name] });
                } else {
                    uniqueProducts.get(prodId)!.environments.push(env.name);
                }
            }

            // 2. Named Values
            console.log(`      🌏 Fetching Named Values...`);
            const nvRes = await AzureService.fetchAPIM<any>(apimConfig, '/namedValues');
            metadata.namedValues[env.name] = (nvRes.value || []).map((nv: any) => ({
                name: nv.name,
                value: nv.properties.value,
                isSecret: nv.properties.secret,
                keyVaultUrl: nv.properties.keyVault ? nv.properties.keyVault.secretIdentifier : null
            }));

            // 3. API Policy Scanning (Forensics)
            console.log(`      📄 Scanning API Policies for identities...`);
            const apiRes = await AzureService.fetchAPIM<any>(apimConfig, '/apis');
            const appIds = new Set<string>();

            for (const api of apiRes.value || []) {
                try {
                    const polRes = await fetch(`https://management.azure.com${api.id}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                        headers: { 'Authorization': `Bearer ${azureToken}` }
                    });
                    if (polRes.ok) {
                        const json = await polRes.json() as any;
                        const xml = json.properties?.value || '';
                        extractClientIdsFromPolicy(xml).forEach(id => appIds.add(id));
                    }
                } catch (e) { }
            }
            metadata.appIds[env.name] = Array.from(appIds);
            console.log(`      ✅ Found ${metadata.appIds[env.name].length} unique App IDs in policies.`);

        } catch (e: any) {
            console.error(`   ❌ Failed to scan ${env.name}:`, e.message);
        }
    }

    // Save Data
    const dataDir = join(process.cwd(), 'apim-database', 'scripts', 'data');
    if (!existsSync(dataDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(dataDir, { recursive: true });
    }

    writeFileSync(join(dataDir, 'apim-inventory.json'), JSON.stringify(Array.from(uniqueProducts.values()), null, 2));
    writeFileSync(join(dataDir, 'apim-metadata.json'), JSON.stringify(metadata, null, 2));

    console.log(`\n✅ Extraction Complete!`);
    console.log(`📊 Inventory: ${uniqueProducts.size} Products.`);
    console.log(`💾 Metadata Saved to: scripts/data/apim-metadata.json`);
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
