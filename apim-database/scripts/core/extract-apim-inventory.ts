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

// --- ARGS ---
const args = process.argv.slice(2);
const targetEnv = args.find(a => a.startsWith('--env='))?.split('=')[1]?.toUpperCase();
const verbose = !args.includes('--quiet');

interface ProductIdentity {
    id: string;
    name: string;
    environments: string[];
}

interface MetadataStore {
    namedValues: Record<string, any[]>; // env -> nv[]
    appIds: Record<string, string[]>;   // env -> unique_guids[] (rolled up for Graph resolution)
    apiContracts: Record<string, any>;  // apiId -> { displayName: string, definition: any }
    backends: Record<string, any[]>;    // env -> backend[]
    apiForensics: Record<string, Record<string, { guids: string[], nvs: string[], backends: string[] }>>; // env -> apiName -> forensics
    productForensics: Record<string, Record<string, { guids: string[], nvs: string[] }>>; // env -> productName -> forensics
    productApiLinks: Record<string, Record<string, Array<{ name: string, path: string, gatewayUrl?: string, serviceUrl?: string }>>>; // env -> productId -> { name, path, urls }[]
    subscriptions: Record<string, any[]>; // env -> subscription[]
    apiIdentities: Record<string, Record<string, string>>; // env -> apiName -> clientId (from auth settings)
    apiOperations: Record<string, Record<string, any[]>>; // env -> apiName -> operations[]
}
const CONCURRENCY_LIMIT = 10;

async function processInBatches<T, R>(items: T[], batchSize: number, task: (item: T) => Promise<R>): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => task(item)));
    }
}
function extractForensicsFromPolicy(xml: string): { guids: string[], nvs: string[], backends: string[] } {
    if (!xml) return { guids: [], nvs: [], backends: [] };
    const guids = new Set<string>();
    const nvs = new Set<string>();
    const backends = new Set<string>();

    // 0. Backend References (Unified Tag Parsing)
    // Looking for ANY tag with backend-id, base-url, dapr-app-id, or set-url
    // Matches: backend-id="...", backend-id = "...", backend-id='...'
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

async function main() {
    console.log(`🚀 [PART 1] Starting APIM Inventory & Metadata Extraction...\n`);
    if (targetEnv) console.log(`🎯 Target Environment: ${targetEnv}\n`);

    console.log(`🔐 [AUTH] Getting Azure access token for APIM Management API...`);
    let azureToken: string;
    try {
        azureToken = await AzureService.getAzureAccessToken();
        console.log(`   ✅ Token obtained successfully.\n`);
    } catch (error: any) {
        console.error(`\n❌ Failed to get Azure access token.`);
        console.error(`   ${error.message}\n`);
        throw error;
    }
    const uniqueProducts = new Map<string, ProductIdentity>();
    const metadata: MetadataStore = {
        namedValues: {},
        appIds: {},
        apiContracts: {},
        backends: {},
        apiForensics: {},
        productForensics: {},
        productApiLinks: {},
        subscriptions: {},
        apiIdentities: {},
        apiOperations: {}
    };

    let envConfigs = config.azure?.environments || [];
    if (targetEnv) {
        envConfigs = envConfigs.filter((env: any) => env.name.toUpperCase() === targetEnv);
    }

    if (envConfigs.length === 0) {
        console.error(`❌ No matching environments found${targetEnv ? ` for ${targetEnv}` : ''}.`);
        process.exit(1);
    }

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

            const envAppIds = new Set<string>();
            const potentialNvs = new Set<string>();

            // --- 0. Global Policy (Priority) ---
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
                            xml = text;
                        }
                    }
                    const { guids, nvs, backends } = extractForensicsFromPolicy(xml);
                    guids.forEach(id => envAppIds.add(id));
                    nvs.forEach(nv => potentialNvs.add(nv));
                    if (verbose && (guids.length > 0 || nvs.length > 0 || backends.length > 0)) {
                        console.log(`      📄 Global Policy: Found ${guids.length} GUIDs, ${nvs.length} NVs, ${backends.length} Backends`);
                    }
                }
            } catch (e) { }

            // --- 1. Products & Product Policies ---
            console.log(`      📦 Fetching Products...`);
            const prodRes = await AzureService.fetchAPIM<any>(apimConfig, '/products');
            const products = prodRes.value || [];
            console.log(`         Found ${products.length} products in ${env.name}`);

            await processInBatches(products, CONCURRENCY_LIMIT, async (p) => {
                const prodId = p.name;
                const prodName = p.properties.displayName;
                if (verbose) {
                    console.log(`         📦 Product: "${prodName}" (ID: ${prodId})`);
                }

                if (!uniqueProducts.has(prodId)) {
                    uniqueProducts.set(prodId, { id: prodId, name: prodName, environments: [env.name] });
                } else {
                    uniqueProducts.get(prodId)!.environments.push(env.name);
                }

                try {
                    const pPolRes = await fetch(`https://management.azure.com${p.id}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                        headers: { 'Authorization': `Bearer ${azureToken}` }
                    });
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
                        const { guids, nvs, backends: _b } = extractForensicsFromPolicy(xml);
                        guids.forEach((id: string) => envAppIds.add(id));
                        nvs.forEach((nv: string) => potentialNvs.add(nv));

                        // Store Product Forensics for Linkage
                        if (!metadata.productForensics[env.name]) metadata.productForensics[env.name] = {};
                        metadata.productForensics[env.name][p.name] = { guids, nvs };

                        if (verbose && (guids.length > 0 || nvs.length > 0)) {
                            console.log(`            📄 Product Policy: ${guids.length} GUIDs, ${nvs.length} NVs`);
                        }
                    }
                } catch (e) { }

                // --- SUBSCRIPTIONS for this Product ---
                try {
                    const subsRes = await fetch(`https://management.azure.com${p.id}/subscriptions?api-version=2022-08-01`, {
                        headers: { 'Authorization': `Bearer ${azureToken}` }
                    });
                    if (subsRes.ok) {
                        const subsData: any = await subsRes.json();
                        const subs = subsData.value || [];

                        if (!metadata.subscriptions[env.name]) {
                            metadata.subscriptions[env.name] = [];
                        }

                        subs.forEach((sub: any) => {
                            metadata.subscriptions[env.name].push({
                                id: sub.name,
                                productId: prodId,
                                displayName: sub.properties.displayName || `default_${prodId}`,
                                state: sub.properties.state,
                                ownerId: sub.properties.ownerId, // e.g., "/users/abc123"
                                scope: sub.properties.scope,
                                createdDate: sub.properties.createdDate,
                                expirationDate: sub.properties.expirationDate,
                                // Note: Keys are NOT extracted here - fetched on-demand
                            });
                        });

                        if (verbose && subs.length > 0) {
                            console.log(`            🔑 Subscriptions: ${subs.length} found`);
                        }
                    }
                } catch (e) { }
            });

            // --- 2. Named Values ---
            console.log(`      🌏 Fetching Named Values...`);
            const nvRes = await AzureService.fetchAPIM<any>(apimConfig, '/namedValues');
            const envNvs = (nvRes.value || []);

            // Get Key Vault token for expiry lookups
            let kvToken: string | undefined;
            try {
                kvToken = await AzureService.getAzureAccessToken('https://vault.azure.net');
            } catch (e) {
                console.warn(`      ⚠️  Failed to get Key Vault token, expiry dates will not be fetched`);
            }

            metadata.namedValues[env.name] = await Promise.all(envNvs.map(async (nv: any) => {
                const nvData: any = {
                    name: nv.name,
                    displayName: nv.properties.displayName,
                    value: nv.properties.value,
                    isSecret: nv.properties.secret,
                    keyVaultUrl: nv.properties.keyVault ? nv.properties.keyVault.secretIdentifier : null,
                    kvSecretExpiry: null
                };

                // Fetch KV secret expiry if it's a Key Vault reference
                if (nv.properties.keyVault && kvToken) {
                    try {
                        const kvUrl = nv.properties.keyVault.secretIdentifier;
                        // Parse: https://{vault}.vault.azure.net/secrets/{secret}/{version}
                        const kvMatch = kvUrl.match(/https:\/\/([^.]+)\.vault\.azure\.net\/secrets\/([^/]+)(?:\/([^/]+))?/);

                        if (kvMatch) {
                            const [, vaultName, secretName, secretVersion] = kvMatch;
                            const secretUrl = secretVersion
                                ? `https://${vaultName}.vault.azure.net/secrets/${secretName}/${secretVersion}?api-version=7.4`
                                : `https://${vaultName}.vault.azure.net/secrets/${secretName}?api-version=7.4`;

                            const secretRes = await fetch(secretUrl, {
                                headers: { 'Authorization': `Bearer ${kvToken}` }
                            });

                            if (secretRes.ok) {
                                const secretData: any = await secretRes.json();
                                if (secretData.attributes?.exp) {
                                    nvData.kvSecretExpiry = new Date(secretData.attributes.exp * 1000).toISOString();
                                }
                            }
                        }
                    } catch (e: any) {
                        if (verbose) console.warn(`         ⚠️  Failed to fetch KV expiry for ${nv.name}: ${e.message}`);
                    }
                }

                return nvData;
            }));

            console.log(`         ✅ Found ${envNvs.length} Named Values`);
            if (verbose) {
                metadata.namedValues[env.name].forEach((nv: any) => {
                    const type = nv.keyVaultUrl ? '🔐 KeyVault' : nv.isSecret ? '🔒 Secret' : '📝 PlainText';
                    const expiry = nv.kvSecretExpiry ? ` (Expires: ${new Date(nv.kvSecretExpiry).toLocaleDateString()})` : '';
                    console.log(`            ${type}: ${nv.name}${expiry}`);
                });
            }

            // --- 2.5 Backends ---
            console.log(`      🔌 Fetching Backend Entities (Region Registry)...`);
            const backendRes = await AzureService.fetchAPIM<any>(apimConfig, '/backends');
            metadata.backends[env.name] = (backendRes.value || []).map((b: any) => ({
                id: b.name,
                url: b.properties.url,
                description: b.properties.description,
                title: b.properties.title,
                resourceId: b.properties.resourceId,
                protocol: b.properties.protocol
            }));
            console.log(`         ✅ Found ${backendRes.value?.length || 0} Backends`);
            if (verbose) {
                (backendRes.value || []).forEach((b: any) => {
                    console.log(`            🔌 ${b.name}: ${b.properties.url || 'N/A'} (${b.properties.protocol || 'http'})`);
                });
            }

            // --- 3. Product-API Associations ---
            console.log(`      🔗 Mapping Product-API Associations...`);
            metadata.productApiLinks[env.name] = {};
            const uniqueApiNamesInEnv = new Set<string>();
            const apiIdMap = new Map<string, string>(); // name -> fullId

            await processInBatches(products, CONCURRENCY_LIMIT, async (p) => {
                try {
                    const pApis = await AzureService.fetchAPIM<any>(apimConfig, `/products/${p.name}/apis`);
                    const apiDetails = (pApis.value || []).map((api: any) => {
                        uniqueApiNamesInEnv.add(api.name);
                        apiIdMap.set(api.name, api.id);

                        // Extract the path from APIM response (this is the relative URL path)
                        const apiPath = api.properties?.path || api.name; // Use path from response, fallback to name only

                        // Log if path is missing (should be rare)
                        if (!api.properties?.path && verbose) {
                            console.log(`         ⚠️  API "${api.name}" missing path property, using name as fallback`);
                        }

                        // Construct Gateway URL (heuristic if not directly available from list)
                        const gatewayUrl = `https://${env.instance}.azure-api.net/${apiPath}`.replace(/\/+/g, '/').replace('https:/', 'https://');

                        return {
                            name: api.name,
                            path: apiPath,
                            gatewayUrl,
                            serviceUrl: api.properties?.serviceUrl
                        };
                    });
                    metadata.productApiLinks[env.name][p.name] = apiDetails;

                    // Extract API Identities (OAuth2)
                    (pApis.value || []).forEach((api: any) => {
                        // Check for OAuth2 settings
                        const auth = api.properties?.authenticationSettings?.oAuth2;
                        // Sometimes Client ID is in openid? Or directly here?
                        // In APIM, usually it points to an OAuth2 Server (authorizationServerId).
                        // BUT valid-jwt policy is the real enforcement.
                        // Let's also check if 'subscriptionKeyParameterNames' or similar reveal anything.
                        // For now if we see an authorizationServerId, we record it.
                        // Actually, often the `resource` or `scope` might be useful. 
                        // To be truly useful, we need the Client ID. 
                        // If we can't get it easily from the list, we rely on the Policy Forensics which WE ALREADY HAVE.
                    });

                } catch (e) { }
            });

            // --- 4. Deduplicated API Policies & Contracts ---
            console.log(`      📄 Scanning ${uniqueApiNamesInEnv.size} unique API Policies...`);
            metadata.apiForensics[env.name] = {};
            let apiProcessedCount = 0;

            await processInBatches(Array.from(uniqueApiNamesInEnv), CONCURRENCY_LIMIT, async (apiName) => {
                const apiFullId = apiIdMap.get(apiName)!;
                const apiDisplayName = apiName; // We'll update this if we fetch the contract

                // 4a. Policy Forensics (Fetch exactly ONCE per API per Env)
                try {
                    // Strip the /products/... part from the ID if we want the actual API-level policy
                    const apiBaseId = apiFullId.replace(/\/products\/[^/]+\/apis\//, '/apis/');
                    const polRes = await fetch(`https://management.azure.com${apiBaseId}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                        headers: { 'Authorization': `Bearer ${azureToken}` }
                    });
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
                        const { guids, nvs, backends } = extractForensicsFromPolicy(xml);
                        guids.forEach((id: string) => envAppIds.add(id));
                        nvs.forEach((nv: string) => potentialNvs.add(nv));

                        // Add serviceUrl as a default backend if present
                        // Use apiBaseId to ensure we hit the actual API resource
                        const apiRes = await fetch(`https://management.azure.com${apiBaseId}?api-version=2022-08-01`, {
                            headers: { 'Authorization': `Bearer ${azureToken}` }
                        });
                        if (apiRes.ok) {
                            const apiData = await apiRes.json() as any;
                            if (apiData.properties?.serviceUrl) {
                                backends.push(`Default: ${apiData.properties.serviceUrl}`);
                            }
                        }

                        metadata.apiForensics[env.name][apiName] = { guids, nvs, backends };
                        apiProcessedCount++;
                        if (verbose) {
                            console.log(`         📄 API "${apiName}": ${guids.length} GUIDs, ${backends.length} Backends`);
                        }
                    }
                } catch (e) { }

                // 4b. Global Contract Cache (Deduplication across Regions)
                if (!metadata.apiContracts[apiName]) {
                    try {
                        const apiBaseId = apiFullId.replace(/\/products\/[^/]+\/apis\//, '/apis/');
                        const contractRes = await fetch(`https://management.azure.com${apiBaseId}?api-version=2022-08-01&export=true&format=openapi`, {
                            headers: { 'Authorization': `Bearer ${azureToken}` }
                        });
                        if (contractRes.ok) {
                            const contractJson = await contractRes.json() as any;
                            metadata.apiContracts[apiName] = {
                                displayName: apiName, // Optimization: skip extra display name fetch for now
                                definition: contractJson.value || contractJson
                            };
                            if (verbose) console.log(`         ✅ Cached Contract: ${apiName}`);
                        }
                    } catch (e) { }
                }

                // 4c. Operations Extraction (Direct from APIM API)
                if (!metadata.apiOperations[env.name]) {
                    metadata.apiOperations[env.name] = {};
                }

                if (!metadata.apiOperations[env.name][apiName]) {
                    try {
                        const apiBaseId = apiFullId.replace(/\/products\/[^/]+\/apis\//, '/apis/');
                        const opsRes = await fetch(`https://management.azure.com${apiBaseId}/operations?api-version=2022-08-01`, {
                            headers: { 'Authorization': `Bearer ${azureToken}` }
                        });
                        if (opsRes.ok) {
                            const opsData: any = await opsRes.json();
                            const operations = (opsData.value || []).map((op: any) => ({
                                id: op.name,
                                name: op.properties.displayName || op.name,
                                method: op.properties.method,
                                urlTemplate: op.properties.urlTemplate,
                                description: op.properties.description || ''
                            }));
                            metadata.apiOperations[env.name][apiName] = operations;
                            if (verbose && operations.length > 0) {
                                console.log(`         🔧 Operations: ${operations.length} found for ${apiName}`);
                            }
                        }
                    } catch (e) { }
                }
            });

            // --- 4. Resolve Named Values ---
            if (potentialNvs.size > 0) {
                if (verbose) console.log(`      🔍 Resolving ${potentialNvs.size} potential Named Value references...`);
                for (const nvKey of potentialNvs) {
                    const match = envNvs.find((nv: any) => nv.name === nvKey || nv.properties.displayName === nvKey);
                    if (match && match.properties.value) {
                        const val = match.properties.value;
                        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(val)) {
                            envAppIds.add(val.toLowerCase());
                            if (verbose) console.log(`         ✅ Resolved {{${nvKey}}} -> ${val.substring(0, 8)}...`);
                        }
                    }
                }
            }

            metadata.appIds[env.name] = Array.from(envAppIds).filter(id => /^[0-9a-f]{8}-/i.test(id));
            console.log(`      ✅ Found ${metadata.appIds[env.name].length} unique App IDs for ${env.name}.`);

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
    if (targetEnv) console.log(`🎯 Results filtered for: ${targetEnv}`);
    console.log(`💾 Metadata Saved to: scripts/data/apim-metadata.json`);
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
