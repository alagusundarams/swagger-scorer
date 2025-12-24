/**
 * @fileoverview MASTER SYNC SCRIPT: Azure APIM -> Self-Service Portal DB
 * 
 * EXECUTION CONTEXT:
 * Run this on the Windows Machine with Azure CLI authenticated (`az login`).
 * 
 * PURPOSE:
 * 1. Pulls "Real-Time" state from Azure APIM (The Truth on the ground).
 * 2. Merges with "Governance" state from Postgres (Approvals, Team Ownership).
 * 3. Pulls "Contract" metadata from Git (if linked).
 * 
 * DATA SOURCE LEGEND:
 * [APIM]   = Derived directly from Azure ARM REST API.
 * [DB]     = Mastered in our Postgres DB (cannot be overwritten by APIM).
 * [GIT]    = Fetched from the linked Repository.
 * [HYBRID] = Calculated/Merged at runtime.
 */

import { Pool } from 'pg';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AzureService, AppRegistration } from './services/AzureService.js';

// --- CONFIG LOADER ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(__dirname, '..', 'config.json');

    let configPath = '';
    if (existsSync(rootConfig)) configPath = rootConfig;
    else if (existsSync(localConfig)) configPath = localConfig;
    else if (existsSync(relativeConfig)) configPath = relativeConfig;

    if (configPath) {
        console.log(`📂 Using config from: ${configPath}`);
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    return {};
}

const config = loadConfig();

// --- CONFIGURATION ---
// STRICT RULE: Resolve Environment from CLI ARGUMENT ONLY.
// Usage: npx tsx scripts/sync-apim-to-db.ts --env=DEV

const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const targetEnvName = envArg ? envArg.split('=')[1] : null;

if (!targetEnvName) {
    console.error('❌ FATAL: Missing required argument "--env={ENV_NAME}"');
    console.error('Usage: npx tsx scripts/sync-apim-to-db.ts --env=DEV');
    process.exit(1);
}

const targetEnvConfig = config.azure?.environments?.find((e: any) => e.name === targetEnvName);

if (!targetEnvConfig) {
    console.error(`❌ FATAL: Environment '${targetEnvName}' not found in config.json!`);
    console.error(`Available environments: ${config.azure?.environments?.map((e: any) => e.name).join(', ')}`);
    process.exit(1);
}

const DB_CONFIG = {
    connectionString: targetEnvConfig.databaseUrl || config.database?.url || process.env.DATABASE_URL
};

const AZURE_CONFIG = {
    subscriptionId: targetEnvConfig.subscriptionId,
    resourceGroup: targetEnvConfig.resourceGroup,
    serviceName: targetEnvConfig.instance,
    environment: targetEnvName
};

// --- DATA TYPES ---
interface ApimProduct {
    id: string;             // [APIM] /products/{id} (slug)
    armId: string;          // [APIM] Full ARM Resource ID
    name: string;           // [APIM] properties.displayName
    description: string;    // [APIM] properties.description
    state: string;          // [APIM] properties.state
    subscriptionRequired: boolean; // [APIM] properties.subscriptionRequired
    subscriptionCount: number; // [APIM] Computed from /subscriptions list
}

interface ApimApi {
    id: string;             // [APIM] /apis/{id}
    name: string;           // [APIM] properties.displayName
    path: string;           // [APIM] properties.path
    protocols: string[];    // [APIM] properties.protocols
    serviceUrl: string;     // [APIM] properties.serviceUrl
    policyXml: string;      // [APIM] /policies/policy
}

// --- HELPER FUNCTIONS ---

async function getAzureToken(): Promise<string> {
    return AzureService.getAzureAccessToken();
}

function getApimConfig(token: string): any {
    return {
        instance: AZURE_CONFIG.serviceName,
        resourceGroup: AZURE_CONFIG.resourceGroup,
        subscriptionId: AZURE_CONFIG.subscriptionId,
        accessToken: token,
        environment: AZURE_CONFIG.environment,
        devops: config.devops // Pass config with externally defined baseUrl
    };
}

// Extraction Regex
function extractClientIdsFromPolicy(xml: string): string[] {
    if (!xml) return [];
    const ids = new Set<string>();

    // Look for named values: {{value}}
    const nvMatches = xml.match(/{{([^}]+)}}/g);
    if (nvMatches) {
        nvMatches.forEach(m => ids.add(m.replace(/[{}]/g, '')));
    }

    // Look for GUIDs 
    const guidMatches = xml.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (guidMatches) {
        guidMatches.forEach(m => ids.add(m));
    }

    return Array.from(ids);
}

async function fetchApimProducts(token: string): Promise<ApimProduct[]> {
    const config = getApimConfig(token);
    const response = await AzureService.fetchAPIM<any>(config, '/products');

    return response.value.map((p: any) => ({
        id: p.name,
        armId: p.id,
        name: p.properties.displayName,
        description: p.properties.description,
        state: p.properties.state,
        subscriptionRequired: p.properties.subscriptionRequired,
        subscriptionCount: 0
    }));
}

async function fetchApimSubscriptions(token: string): Promise<any[]> {
    const config = getApimConfig(token);
    const response = await AzureService.fetchAPIM<any>(config, '/subscriptions');

    return response.value.map((s: any) => ({
        id: s.name,
        name: s.properties.displayName,
        scope: s.properties.scope, // Needed for filtering
        productId: s.properties.scope.split('/').pop(),
        userId: s.properties.ownerId ? s.properties.ownerId.split('/').pop() : 'unknown',
        state: s.properties.state,
        primaryKey: 'redacted-sync-real',
        createdDate: s.properties.createdDate
    }));
}

async function fetchNamedValues(token: string): Promise<any[]> {
    const config = getApimConfig(token);
    const response = await AzureService.fetchAPIM<any>(config, '/namedValues');

    return response.value.map((nv: any) => ({
        name: nv.name,
        value: nv.properties.value,
        isSecret: nv.properties.secret,
        keyVaultUrl: nv.properties.keyVault ? nv.properties.keyVault.secretIdentifier : null
    }));
}

async function fetchGitInfo(productId: string): Promise<{ hash: string, date: string }> {
    return { hash: 'manual-or-git-linked', date: new Date().toISOString() };
}

async function fetchApimApis(token: string): Promise<ApimApi[]> {
    const config = getApimConfig(token);
    const response = await AzureService.fetchAPIM<any>(config, '/apis');
    const apis = response.value;

    // Fetch policies (Batch or Parallel)
    // We do simplified parallel fetch for policy content
    console.log(`⏳ Fetching Policies for ${apis.length} APIs...`);
    const results = await Promise.all(apis.map(async (a: any) => {
        let policyXml = '';
        try {
            const polRes = await fetch(`https://management.azure.com${a.id}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                headers: { 'Authorization': `Bearer ${config.accessToken}` }
            });
            if (polRes.ok) {
                // Response is JSON wrapper usually: { value: xml, format: ... } or raw text?
                // Depending on endpoint. /policies/policy is a resource.
                const json = await polRes.json();
                policyXml = json.properties?.value || '';
            }
        } catch (e) { /* ignore */ }

        return {
            id: a.name,
            name: a.properties.displayName,
            path: a.properties.path,
            protocols: a.properties.protocols,
            serviceUrl: a.properties.serviceUrl,
            policyXml: policyXml
        };
    }));

    return results;
}

// --- MAIN EXECUTION ---
async function main() {
    // --- LOGGING SETUP ---
    const logDir = join(__dirname, 'logs');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(logDir, `sync_${AZURE_CONFIG.environment}_${timestamp}.log`);

    // Override Console for Dual Logging (File + Stdout)
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function writeToLog(level: string, args: any[]) {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        const time = new Date().toISOString();
        const line = `[${time}] [${level}] ${msg}\n`;
        appendFileSync(logFile, line);
    }

    console.log = (...args) => { writeToLog('INFO', args); originalLog(...args); };
    console.warn = (...args) => { writeToLog('WARN', args); originalWarn(...args); };
    console.error = (...args) => { writeToLog('ERROR', args); originalError(...args); };

    console.log(`📝 Logging to: ${logFile}`);
    console.log(`🚀 Starting Master Sync for ENV: ${AZURE_CONFIG.environment}...`);
    const pool = new Pool(DB_CONFIG);

    try {
        const token = await getAzureToken();
        const apimConfig = getApimConfig(token);
        console.log('✅ Azure Auth Token Acquired');

        // 1. INITIALIZE PLACEHOLDERS
        // Ensure 'unknown-product' exists for unlinked items
        await pool.query(`
            INSERT INTO products (id, name, display_name, version, environment, state, owner_team_id, updated_at)
            VALUES ('unknown-product', 'unknown-product', 'Unknown Product', '0.0.0', $1, 'notPublished', NULL, NOW())
            ON CONFLICT (id) DO NOTHING
        `, [AZURE_CONFIG.environment]);

        // 2. IDENTITY SYNC: Fetch Real AD Groups for Current User
        const myGroups = await AzureService.fetchUserGroups();
        console.log(`👥 Found ${myGroups.length} AD Groups for the current user.`);
        for (const g of myGroups) {
            await pool.query(`
                INSERT INTO teams (id, display_name, description, contact_email, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (id) DO UPDATE SET 
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    contact_email = EXCLUDED.contact_email,
                    updated_at = NOW();
            `, [g.id, g.displayName, g.description, g.mail]);
        }

        // 3. FETCH GLOBAL INVENTORY [SOURCE: APIM]
        const apimProducts = await fetchApimProducts(token);
        const apimApis = await fetchApimApis(token);
        console.log(`📊 Found ${apimProducts.length} Products and ${apimApis.length} APIs in Azure.`);

        // 4. FETCH SUBSCRIPTIONS
        let apimSubs: any[] = [];
        try {
            apimSubs = await fetchApimSubscriptions(token);
            console.log(`🔑 Found ${apimSubs.length} Subscriptions.`);
        } catch (e) {
            console.warn('⚠️ [PROD WARNING] Could not fetch Subscriptions. Skipping keys.');
        }

        // 5. FETCH NAMED VALUES (For Environment Config & KeyVault Detection)
        let namedValues: any[] = [];
        try {
            namedValues = await fetchNamedValues(token);
            console.log(`🌍 Found ${namedValues.length} Named Values.`);
        } catch (e) {
            console.warn('⚠️ [PROD WARNING] Could not fetch Named Values. Skipping config.');
        }

        // Build NV Map for resolution
        const nvMap = new Map<string, any>(namedValues.map(n => [n.name, n]));

        // --- WRITING TO DB ---

        // A. SYNC PRODUCTS
        for (const p of apimProducts) {
            console.log(`Processing Product: ${p.name}...`);

            // [HYBRID] DYNAMIC OWNERSHIP via TAGS
            const tags = await AzureService.fetchTagsForProduct(apimConfig, p.armId);
            const inferredTeamId = tags.TeamID || tags.Owner || 'orphaned';

            if (inferredTeamId !== 'orphaned') {
                // Upsert placeholder team if needed to satisfy FK
                await pool.query(`
                    INSERT INTO teams (id, display_name, updated_at)
                    VALUES ($1, $1, NOW())
                    ON CONFLICT (id) DO NOTHING
                `, [inferredTeamId]);
            }

            // DB Value: NULL if orphaned, otherwise the ID
            const dbOwnerId = inferredTeamId === 'orphaned' ? null : inferredTeamId;

            const gitInfo = await fetchGitInfo(p.id);
            const anomalies: string[] = [];
            if (!gitInfo.hash) anomalies.push('MANUAL_CREATION');
            if (inferredTeamId === 'orphaned') anomalies.push('UNOWNED');

            const derivedManagementMode = anomalies.includes('MANUAL_CREATION') ? 'TERRAFORM_MANAGED' : 'HYBRID';

            await pool.query(`
                INSERT INTO products (id, name, display_name, version, environment, description, state, subscriber_count, owner_team_id, 
                    last_deployed_commit_hash, last_deployed_at, detected_anomalies, management_mode, updated_at)
                VALUES ($1, $1, $2, '1.0.0', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    state = EXCLUDED.state,
                    subscriber_count = EXCLUDED.subscriber_count,
                    owner_team_id = EXCLUDED.owner_team_id,
                    last_deployed_commit_hash = EXCLUDED.last_deployed_commit_hash,
                    detected_anomalies = EXCLUDED.detected_anomalies,
                    management_mode = EXCLUDED.management_mode,
                    updated_at = NOW();
            `, [p.id, p.name, p.description, AZURE_CONFIG.environment, p.description, p.state, p.subscriptionCount, dbOwnerId, gitInfo.hash, gitInfo.date, JSON.stringify(anomalies), derivedManagementMode]);
        }

        // B. SYNC APIs
        const capturedAppIds = new Set<string>();

        for (const a of apimApis) {
            console.log(`Processing API: ${a.name} (${a.path})...`);

            const rawData = JSON.stringify({
                protocols: a.protocols,
                serviceUrl: a.serviceUrl,
                policyXml: a.policyXml
            });

            await pool.query(`
                INSERT INTO apis (
                    id, name, display_name, path, product_id, apim_raw_data, updated_at
                )
                VALUES ($1, $1, $2, $3, 'unknown-product', $4, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    path = EXCLUDED.path,
                    apim_raw_data = EXCLUDED.apim_raw_data,
                    updated_at = NOW();
            `, [a.id, a.name, a.path, rawData]);

            // App ID Extraction from Policy
            const extracted = extractClientIdsFromPolicy(a.policyXml);
            extracted.forEach(cid => {
                capturedAppIds.add(cid);
            });
        }

        // C. SYNC SUBSCRIPTIONS
        for (const s of apimSubs) {
            // Strict Filter: Only sync Product-scoped subscriptions
            if (!s.scope || !s.scope.toLowerCase().includes('/products/')) {
                console.warn(`⚠️ Skipping Non-Product Subscription: ${s.name} (Scope: ${s.scope})`);
                continue;
            }

            // Ensure the subscriber team (user) exists
            await pool.query(`
                INSERT INTO teams (id, display_name, type, updated_at)
                VALUES ($1, $1, 'consumer', NOW())
                ON CONFLICT (id) DO NOTHING
            `, [s.userId]);

            await pool.query(`
                INSERT INTO subscriptions (
                    id, product_id, subscriber_team_id, state,
                    primary_key_name, primary_key_value, 
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, 'primary', $5, $6, NOW())
                ON CONFLICT (id) DO UPDATE SET 
                    state = EXCLUDED.state,
                    updated_at = NOW();
            `, [s.id, s.productId, s.userId, s.state, s.primaryKey, s.createdDate]);
        }

        // D. SYNC ENVIRONMENT CONFIG
        for (const nv of namedValues) {
            // If it's a KV URL, show that. If secret, show ***. If plain, show value.
            const val = nv.keyVaultUrl ? `KeyVault Ref: ${nv.keyVaultUrl}` : (nv.isSecret ? '***' : nv.value);
            await pool.query(`
                INSERT INTO access_control_lists (key, environment, value)
                VALUES ($1, $2, $3)
                ON CONFLICT (key, environment) DO UPDATE SET 
                    value = EXCLUDED.value;
            `, [nv.name, AZURE_CONFIG.environment, val]);
        }

        // E. PROCESS APP REGISTRATIONS
        // Resolve captured IDs: Literal GUIDs vs Named Values
        console.log(`🔗 Resolving ${capturedAppIds.size} potential App Identities...`);
        const realGuidCandidates: string[] = [];
        const appParams = new Map<string, { displayName: string, clientId: string }>();

        for (const cid of capturedAppIds) {
            if (nvMap.has(cid)) {
                // It's a Named Value
                const nv = nvMap.get(cid);
                if (nv.keyVaultUrl) {
                    // It's a KeyVault Reference -> "Smart" handling
                    appParams.set(cid, {
                        clientId: cid, // Use the NV Key as ID
                        displayName: `KeyVault: ${nv.keyVaultUrl}`
                    });
                } else if (!nv.isSecret && nv.value) {
                    // It resolves to a plain value (likely a GUID)
                    const val = nv.value;
                    if (/^[0-9a-f]{8}-/i.test(val)) {
                        realGuidCandidates.push(val);
                        // Map NV -> Real GUID so we can update display name later
                        appParams.set(cid, { clientId: val, displayName: 'Pending Lookup...' });
                    }
                }
            } else if (/^[0-9a-f]{8}-/i.test(cid)) {
                // Literal GUID
                realGuidCandidates.push(cid);
                appParams.set(cid, { clientId: cid, displayName: 'Pending Lookup...' });
            }
        }

        // Resolve Real GUIDs via Graph
        if (realGuidCandidates.length > 0) {
            const resolvedApps = await AzureService.fetchAppRegistrations(realGuidCandidates);
            for (const app of resolvedApps) {
                // Update params where clientId matches
                for (const [key, val] of appParams.entries()) {
                    if (val.clientId === app.appId) {
                        val.displayName = app.displayName;
                    }
                }
            }
        }

        // Upsert Apps using appParams
        for (const [key, val] of appParams.entries()) {
            await pool.query(`
                INSERT INTO app_registrations (id, client_id, display_name, environment, product_id, owner_team_id)
                VALUES ($1, $1, $2, $3, 'unknown-product', NULL)
                ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
            `, [val.clientId, val.displayName, AZURE_CONFIG.environment]);
        }

        console.log('✅ Sync Complete.');

    } catch (err) {
        console.error('❌ Sync Failed:', err);
    } finally {
        await pool.end();
    }
}

main();
