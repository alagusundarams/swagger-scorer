/**
 * @fileoverview DEBUG TOOL: Policy Forensics Validator
 * 
 * PURPOSE:
 * 1. Target a single product or API.
 * 2. Fetch the actual Policy XML.
 * 3. Run extraction forensics and output findings.
 * 4. Verify resolving Named Values.
 */

import { readFileSync, existsSync } from 'fs';
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

// --- EXTRACTION LOGIC (Copied from core/extract-apim-inventory.ts for isolation) ---
function extractForensicsFromPolicy(xml: string): { guids: string[], nvs: string[], backends: string[] } {
    if (!xml) return { guids: [], nvs: [], backends: [] };
    const guids = new Set<string>();
    const nvs = new Set<string>();
    const backends = new Set<string>();

    // 0. Backend References
    const backendMatches = xml.match(/backend-id=["']([^"']+)["']/gi);
    if (backendMatches) {
        backendMatches.forEach(m => {
            const id = m.split(/["']/)[1];
            backends.add(id);
        });
    }

    // 1. Direct GUIDs
    const guidMatches = xml.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi);
    if (guidMatches) guidMatches.forEach(m => guids.add(m.toLowerCase()));

    // 2. Named Value References {{env-name}}
    const nvMatches = xml.match(/\{\{([^}]+)\}\}/g);
    if (nvMatches) {
        nvMatches.forEach(m => {
            const name = m.replace(/[{}]/g, '').trim();
            nvs.add(name);
        });
    }

    // 3. Attribute-based (Surgical)
    const attrMatches = xml.match(/(audience|application-id|client-id|azp|aud)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(m => {
            const val = m.split(/["']/)[1];
            if (/^[0-9a-fA-F]{8}-/.test(val)) guids.add(val.toLowerCase());
            else if (val.startsWith('{{')) {
                nvs.add(val.replace(/[{}]/g, '').trim());
            }
        });
    }

    return {
        guids: Array.from(guids),
        nvs: Array.from(nvs),
        backends: Array.from(backends)
    };
}

async function debug() {
    const args = process.argv.slice(2);
    const targetProduct = args[0]; // e.g. "product-a"
    const targetEnv = args.find(a => a.startsWith('--env='))?.split('=')[1]?.toUpperCase() || 'DEV';
    const verbose = !args.includes('--quiet');

    if (!targetProduct) {
        console.log("Usage: npx tsx scripts/debug/debug-policy-forensics.ts <productId> [--env=DEV|QA|PROD]");
        process.exit(1);
    }

    console.log(`🔍 [DEBUG] Surgically inspecting product: ${targetProduct} in ${targetEnv}\n`);

    const env = config.azure?.environments?.find((e: any) => e.name.toUpperCase() === targetEnv);
    if (!env) {
        console.error(`❌ Environment ${targetEnv} not found in config.`);
        process.exit(1);
    }

    const azureToken = await AzureService.getAzureAccessToken();
    const apimConfig = {
        instance: env.instance,
        resourceGroup: env.resourceGroup,
        subscriptionId: env.subscriptionId,
        accessToken: azureToken
    };

    // 1. Fetch Named Values for resolution
    console.log(`🌏 Fetching context (Named Values)...`);
    const nvRes = await AzureService.fetchAPIM<any>(apimConfig, '/namedValues');
    const allNvs = nvRes.value || [];

    // 1.5 Fetch Global Backends for reference
    console.log(`🔌 Fetching Backend Inventory...`);
    const backRes = await AzureService.fetchAPIM<any>(apimConfig, '/backends');
    const allBackends = backRes.value || [];
    console.log(`   ✅ Found ${allBackends.length} Backends in inventory.`);

    // 1.8 Global Policy Forensics
    if (verbose) console.log(`\n🌎 Inspecting Global Policy...`);
    try {
        const globalUrl = `https://management.azure.com/subscriptions/${env.subscriptionId}/resourceGroups/${env.resourceGroup}/providers/Microsoft.ApiManagement/service/${env.instance}/policies/policy?api-version=2022-08-01&format=rawxml`;
        const gPolRes = await fetch(globalUrl, { headers: { 'Authorization': `Bearer ${azureToken}` } });
        if (gPolRes.ok) {
            const json = await gPolRes.json() as any;
            const xml = json.properties?.value || '';
            const results = extractForensicsFromPolicy(xml);
            console.log(`   ✅ App IDs:`, results.guids);
            console.log(`   ✅ Named Values:`, results.nvs);
            console.log(`   ✅ Backends:`, results.backends);
            if (verbose && xml) console.log(`      📄 Policy XML Length: ${xml.length} characters`);
        }
    } catch (e) { }

    // 2. Fetch Product Policy
    if (verbose) console.log(`📦 Inspecting Product Policy: ${targetProduct}...`);
    try {
        const prodUrl = `https://management.azure.com/subscriptions/${env.subscriptionId}/resourceGroups/${env.resourceGroup}/providers/Microsoft.ApiManagement/service/${env.instance}/products/${targetProduct}/policies/policy?api-version=2022-08-01&format=rawxml`;
        const pPolRes = await fetch(prodUrl, { headers: { 'Authorization': `Bearer ${azureToken}` } });
        if (pPolRes.ok) {
            const json = await pPolRes.json() as any;
            const xml = json.properties?.value || '';
            const results = extractForensicsFromPolicy(xml);
            console.log(`   ✅ App IDs:`, results.guids);
            console.log(`   ✅ Named Values:`, results.nvs);
            console.log(`   ✅ Backends:`, results.backends);

            // Resolve NVs
            results.nvs.forEach(nvKey => {
                const match = allNvs.find((nv: any) => nv.name === nvKey || nv.properties.displayName === nvKey);
                if (match) console.log(`      🔗 Resolved {{${nvKey}}} -> ${match.properties.secret ? '*** (Secret)' : match.properties.value}`);
            });

            // Resolve Backends
            results.backends.forEach(bId => {
                const match = allBackends.find((b: any) => b.name === bId);
                if (match) console.log(`      🔗 Resolved Backend [${bId}] -> ${match.properties.url}`);
                else console.log(`      ⚠️  Backend [${bId}] reference found but NOT in inventory.`);
            });
        } else {
            console.error(`   ⚠️ Product policy not found or inaccessible (HTTP ${pPolRes.status})`);
        }
    } catch (e) {
        console.error(`   ❌ Error fetching product policy:`, e);
    }

    // 3. Fetch APIs for this product
    console.log(`\n📡 Inspecting APIs for ${targetProduct}...`);
    const apisRes = await AzureService.fetchAPIM<any>(apimConfig, `/products/${targetProduct}/apis`);
    for (const api of apisRes.value || []) {
        console.log(`   🔹 API: ${api.properties.displayName} (${api.name})`);
        try {
            const apiPolUrl = `https://management.azure.com${api.id}/policies/policy?api-version=2022-08-01&format=rawxml`;
            const polRes = await fetch(apiPolUrl, { headers: { 'Authorization': `Bearer ${azureToken}` } });
            if (polRes.ok) {
                const json = await polRes.json() as any;
                const xml = json.properties?.value || '';
                const results = extractForensicsFromPolicy(xml);
                console.log(`      ✅ App IDs:`, results.guids);
                console.log(`      ✅ Named Values:`, results.nvs);
                console.log(`      ✅ Backends:`, results.backends);

                // Resolve NVs
                results.nvs.forEach(nvKey => {
                    const match = allNvs.find((nv: any) => nv.name === nvKey || nv.properties.displayName === nvKey);
                    if (match) console.log(`         🔗 Resolved {{${nvKey}}} -> ${match.properties.secret ? '*** (Secret)' : match.properties.value}`);
                });

                // Resolve Backends
                results.backends.forEach(bId => {
                    const match = allBackends.find((b: any) => b.name === bId);
                    if (match) console.log(`         🔗 Resolved Backend [${bId}] -> ${match.properties.url}`);
                    else console.log(`         ⚠️  Backend [${bId}] reference found but NOT in inventory.`);
                });
            }
        } catch (e) { }
    }

    console.log(`\n✅ Debug Inspection Complete.`);
}

debug().catch(err => console.error(`\n💥 Fatal Error:`, err));
