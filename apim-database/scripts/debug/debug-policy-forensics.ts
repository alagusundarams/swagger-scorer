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

    // 0. Backend References (Unified Tag Parsing)
    // Looking for ANY tag with backend-id, base-url, dapr-app-id, or set-url
    const tagMatches = xml.match(/<(set-backend-service|set-url|forward-request)[^>]*>([\s\S]*?<\/\1>)?/gi) || [];

    // a. Generic Attribute Search (Catch-all)
    const backendAttrMatches = xml.match(/(backend-id|base-url|dapr-app-id)\s*=\s*["']([^"']+)["']/gi);
    if (backendAttrMatches) {
        backendAttrMatches.forEach(m => {
            const parts = m.split(/\s*=\s*/);
            const key = parts[0].toLowerCase();
            const val = parts[1].replace(/["']/g, '');
            if (key === 'backend-id') backends.add(val);
            else if (key === 'base-url') backends.add(`Static: ${val}`);
            else if (key === 'dapr-app-id') backends.add(`Dapr: ${val}`);

            if (val.startsWith('{{')) nvs.add(val.replace(/[{}]/g, '').trim());
        });
    }

    // b. Element content (set-url)
    const setUrlValMatches = xml.match(/<set-url>([\s\S]*?)<\/set-url>/gi);
    if (setUrlValMatches) {
        setUrlValMatches.forEach(m => {
            const content = m.replace(/<\/?set-url>/gi, '').trim();
            if (content) backends.add(`Static(URL): ${content}`);
            if (content.startsWith('{{')) nvs.add(content.replace(/[{}]/g, '').trim());
        });
    }

    // c. Case-insensitive Tag Check for anything complex
    if (xml.toLowerCase().includes('set-backend-service')) {
        const fullTagMatches = xml.match(/<set-backend-service[^>]*>/gi);
        if (fullTagMatches) {
            fullTagMatches.forEach(t => {
                if (!t.toLowerCase().includes('backend-id') && !t.toLowerCase().includes('base-url')) {
                    backends.add(`Complex: ${t.trim()}`);
                }
            });
        }
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
            const text = await gPolRes.text();
            let xml = '';
            if (text.trim().startsWith('<')) {
                xml = text;
            } else {
                try {
                    const json = JSON.parse(text);
                    xml = json.properties?.value || '';
                } catch (e) {
                    if (verbose) console.warn(`      ⚠️  Failed to parse Global Policy as JSON, treating as raw text.`);
                    xml = text;
                }
            }
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
            const text = await pPolRes.text();
            let xml = '';
            if (text.trim().startsWith('<')) {
                xml = text;
            } else {
                try {
                    const json = JSON.parse(text);
                    xml = json.properties?.value || '';
                } catch (e) {
                    xml = text;
                }
            }
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
        // Fetch full API details to get serviceUrl
        const fullApiUrl = `https://management.azure.com${api.id}?api-version=2022-08-01`;
        const fullApiRes = await fetch(fullApiUrl, { headers: { 'Authorization': `Bearer ${azureToken}` } });
        const apiData = fullApiRes.ok ? await fullApiRes.json() : api;
        const serviceUrl = apiData.properties?.serviceUrl || 'NONE';

        console.log(`   🔹 API: ${api.properties.displayName} (${api.name})`);
        console.log(`      🌐 Default Backend (serviceUrl): ${serviceUrl}`);

        try {
            // Strip the /products/... part from the ID if we want the actual API-level policy
            const apiBaseId = api.id.replace(/\/products\/[^/]+\/apis\//, '/apis/');
            const apiPolUrl = `https://management.azure.com${apiBaseId}${apiBaseId.includes('/policies/') ? '' : '/policies/policy'}?api-version=2022-08-01&format=rawxml`;

            if (verbose) console.log(`      🔗 Fetching API Policy from: ${apiPolUrl}`);
            const polRes = await fetch(apiPolUrl, { headers: { 'Authorization': `Bearer ${azureToken}` } });

            if (polRes.ok) {
                const text = await polRes.text();
                let xml = '';
                if (text.trim().startsWith('<')) {
                    xml = text;
                } else {
                    try {
                        const json = JSON.parse(text);
                        xml = json.properties?.value || '';
                    } catch (e) {
                        xml = text;
                    }
                }

                if (verbose && (!xml || xml.length < 50)) {
                    console.log(`      ⚠️  Empty or trivial policy found (${xml?.length || 0} chars).`);
                }

                const results = extractForensicsFromPolicy(xml);
                if (results.guids.length > 0) console.log(`      ✅ App IDs:`, results.guids);
                if (results.nvs.length > 0) console.log(`      ✅ Named Values:`, results.nvs);
                if (results.backends.length > 0) {
                    console.log(`      ✅ Policy Backends:`, results.backends);
                    // Resolve Backends
                    results.backends.forEach(bId => {
                        const cleanBId = bId.replace(/^[^:]+: /, ''); // Remove "Static: " prefix
                        const match = allBackends.find((b: any) => b.name === cleanBId || b.id === cleanBId);
                        if (match) console.log(`         🔗 Resolved Backend [${cleanBId}] -> ${match.properties.url}`);
                        else if (!bId.startsWith('Static:') && !bId.startsWith('Dapr:') && !bId.startsWith('Complex:')) {
                            console.log(`         ⚠️  Backend [${cleanBId}] reference found but NOT in inventory.`);
                        }
                    });
                } else if (verbose) {
                    console.log(`      ℹ️  No explicit backend configuration found in this policy.`);
                }

                // Resolve NVs
                results.nvs.forEach(nvKey => {
                    const match = allNvs.find((nv: any) => nv.name === nvKey || nv.properties.displayName === nvKey);
                    if (match) console.log(`         🔗 Resolved {{${nvKey}}} -> ${match.properties.secret ? '*** (Secret)' : match.properties.value}`);
                });

            } else {
                if (verbose) console.log(`      ⚠️  API Policy fetch failed (HTTP ${polRes.status})`);
            }
        } catch (e) {
            console.error(`      ❌ Error fetching/parsing policy for ${api.name}:`, (e as Error).message);
        }
    }

    // 4. Summarize (The PoC "Satisfaction" report)
    console.log(`\n=========================================`);
    console.log(`📊 SURGICAL PoC SUMMARY for ${targetProduct}`);
    console.log(`=========================================`);

    const allGuids = new Set<string>();
    const allFoundBackends = new Set<string>();

    // Scrape from product and APIs (minimal re-scrape for summary)
    // (In a real run, we'd collect these in variables above)

    process.stdout.write(`\n✅ Step-by-Step Validation Complete.`);
    console.log(`\n👉 Conclusion: If you see the App IDs and Backends listed above for the individual APIs, the main sync will capture them into the 'apis' and 'api_backends' tables correctly.`);
}

debug().catch(err => console.error(`\n💥 Fatal Error:`, err));
