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
import { fork } from 'child_process';
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
        // console.log(`📂 Using config from: ${configPath}`); // Reduce noise in orchestrator
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    return {};
}

const config = loadConfig();

// --- ENTRY POINT LOGIC ---
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const targetEnvName = envArg ? envArg.split('=')[1] : null;

if (!targetEnvName) {
    // === ORCHESTRATOR MODE ===
    runOrchestrator();
} else {
    // === WORKER MODE ===
    runWorker(targetEnvName);
}

// --- ORCHESTRATOR ---
async function runOrchestrator() {
    const envs = config.azure?.environments || [];
    if (envs.length === 0) {
        console.error("❌ No environments found in config.json");
        process.exit(1);
    }

    console.log(`🚀 [ORCHESTRATOR] Starting Parallel Sync for ${envs.length} environments: ${envs.map((e: any) => e.name).join(', ')}`);
    console.log(`Logs will be written to scripts/logs/`);

    const processes = envs.map((env: any) => {
        return new Promise<void>((resolve) => {
            console.log(`👉 Spawning worker for ${env.name}...`);
            // Fork this same script with the --env argument
            const child = fork(process.argv[1], [`--env=${env.name}`], {
                stdio: 'inherit' // Pipe output to main console too? Or 'ignore' if strictly log file?
                // User said "separate log files". Keeping inherit is good for "alive" check, 
                // but logs are dual-written in worker.
                // Let's keep inherit so user sees progress.
            });

            child.on('exit', (code) => {
                const status = code === 0 ? '✅ SUCCESS' : '❌ FAILED';
                console.log(`🏁 [ORCHESTRATOR] Worker ${env.name} finished: ${status}`);
                resolve();
            });
        });
    });

    await Promise.all(processes);
    console.log("✨ All environments completed.");
}

// --- WORKER ---

// --- DATA TYPES ---
interface ApimProduct {
    id: string;
    armId: string;
    name: string;
    description: string;
    state: string;
    subscriptionRequired: boolean;
    subscriptionCount: number;
}

interface ApimApi {
    id: string;
    name: string;
    path: string;
    protocols: string[];
    serviceUrl: string;
    policyXml: string;
}

interface AzureConfig {
    subscriptionId: string;
    resourceGroup: string;
    serviceName: string;
    environment: string;
}

// --- HELPER FUNCTIONS (Refactored to accept Config) ---

async function getAzureToken(): Promise<string> {
    return AzureService.getAzureAccessToken();
}

function getApimConfig(token: string, azConfig: AzureConfig): any {
    return {
        instance: azConfig.serviceName,
        resourceGroup: azConfig.resourceGroup,
        subscriptionId: azConfig.subscriptionId,
        accessToken: token,
        environment: azConfig.environment,
        devops: config.devops
    };
}

function extractClientIdsFromPolicy(xml: string): string[] {
    if (!xml) return [];
    const ids = new Set<string>();
    const nvMatches = xml.match(/{{([^}]+)}}/g);
    if (nvMatches) nvMatches.forEach(m => ids.add(m.replace(/[{}]/g, '')));
    const guidMatches = xml.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (guidMatches) guidMatches.forEach(m => ids.add(m));
    return Array.from(ids);
}

async function fetchApimProducts(token: string, azConfig: AzureConfig): Promise<ApimProduct[]> {
    const apiConfig = getApimConfig(token, azConfig);
    const response = await AzureService.fetchAPIM<any>(apiConfig, '/products');
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

async function fetchApimSubscriptions(token: string, azConfig: AzureConfig): Promise<any[]> {
    const apiConfig = getApimConfig(token, azConfig);
    const response = await AzureService.fetchAPIM<any>(apiConfig, '/subscriptions');
    return response.value.map((s: any) => ({
        id: s.name,
        name: s.properties.displayName,
        scope: s.properties.scope,
        productId: s.properties.scope.split('/').pop(),
        userId: s.properties.ownerId ? s.properties.ownerId.split('/').pop() : 'unknown',
        state: s.properties.state,
        primaryKey: 'redacted-sync-real',
        createdDate: s.properties.createdDate
    }));
}

async function fetchNamedValues(token: string, azConfig: AzureConfig): Promise<any[]> {
    const apiConfig = getApimConfig(token, azConfig);
    const response = await AzureService.fetchAPIM<any>(apiConfig, '/namedValues');
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

async function fetchApimApis(token: string, azConfig: AzureConfig): Promise<ApimApi[]> {
    const apiConfig = getApimConfig(token, azConfig);
    const response = await AzureService.fetchAPIM<any>(apiConfig, '/apis');
    const apis = response.value;

    console.log(`⏳ [${azConfig.environment}] Fetching Policies for ${apis.length} APIs...`);
    const results = await Promise.all(apis.map(async (a: any) => {
        let policyXml = '';
        try {
            const polRes = await fetch(`https://management.azure.com${a.id}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                headers: { 'Authorization': `Bearer ${apiConfig.accessToken}` }
            });
            if (polRes.ok) {
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

// --- MAIN WORKER ---
async function runWorker(envName: string) {
    // 1. Validate Env
    const targetEnvConfig = config.azure?.environments?.find((e: any) => e.name === envName);
    if (!targetEnvConfig) {
        console.error(`❌ FATAL: Environment '${envName}' not found in config.json!`);
        process.exit(1);
    }

    const AZURE_CONFIG: AzureConfig = {
        subscriptionId: targetEnvConfig.subscriptionId,
        resourceGroup: targetEnvConfig.resourceGroup,
        serviceName: targetEnvConfig.instance,
        environment: envName
    };

    const DB_CONFIG = {
        connectionString: targetEnvConfig.databaseUrl || config.database?.url || process.env.DATABASE_URL
    };

    // 2. Logging Setup
    const logDir = join(__dirname, 'logs');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(logDir, `sync_${AZURE_CONFIG.environment}_${timestamp}.log`);

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function writeToLog(level: string, args: any[]) {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        const time = new Date().toISOString();
        const line = `[${time}] [${level}] ${msg}\n`;
        appendFileSync(logFile, line);
    }

    // Capture logs only for this worker's output
    console.log = (...args) => { writeToLog('INFO', args); originalLog(`[${envName}]`, ...args); };
    console.warn = (...args) => { writeToLog('WARN', args); originalWarn(`[${envName}]`, ...args); };
    console.error = (...args) => { writeToLog('ERROR', args); originalError(`[${envName}]`, ...args); };

    console.log(`📝 Logging to: ${logFile}`);
    console.log(`🚀 Starting Worker for ENV: ${AZURE_CONFIG.environment}`);

    const pool = new Pool(DB_CONFIG);

    try {
        const token = await getAzureToken();
        const apimConfig = getApimConfig(token, AZURE_CONFIG);
        console.log('✅ Azure Auth Token Acquired');

        await pool.query(`
            INSERT INTO products (id, name, display_name, version, environment, state, owner_team_id, updated_at)
            VALUES ('unknown-product', 'unknown-product', 'Unknown Product', '0.0.0', $1, 'notPublished', NULL, NOW())
            ON CONFLICT (id) DO NOTHING
        `, [AZURE_CONFIG.environment]);

        const myGroups = await AzureService.fetchUserGroups();
        console.log(`👥 Found ${myGroups.length} AD Groups`);
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

        const apimProducts = await fetchApimProducts(token, AZURE_CONFIG);
        const apimApis = await fetchApimApis(token, AZURE_CONFIG);
        console.log(`📊 Found ${apimProducts.length} Products, ${apimApis.length} APIs`);

        let apimSubs: any[] = [];
        try {
            apimSubs = await fetchApimSubscriptions(token, AZURE_CONFIG);
            console.log(`🔑 Found ${apimSubs.length} Subscriptions`);
        } catch (e) {
            console.warn('⚠️ Could not fetch Subscriptions');
        }

        let namedValues: any[] = [];
        try {
            namedValues = await fetchNamedValues(token, AZURE_CONFIG);
            console.log(`🌍 Found ${namedValues.length} Named Values`);
        } catch (e) {
            console.warn('⚠️ Could not fetch Named Values');
        }

        const nvMap = new Map<string, any>(namedValues.map(n => [n.name, n]));

        // --- WRITING TO DB ---
        for (const p of apimProducts) {
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

        const capturedAppIds = new Set<string>();
        for (const a of apimApis) {
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

            extractClientIdsFromPolicy(a.policyXml).forEach(cid => capturedAppIds.add(cid));
        }

        for (const s of apimSubs) {
            if (!s.scope || !s.scope.toLowerCase().includes('/products/')) {
                console.warn(`⚠️ Skipping Non-Product Subscription: ${s.name} (Scope: ${s.scope})`);
                continue;
            }

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

        for (const nv of namedValues) {
            const val = nv.keyVaultUrl ? `KeyVault Ref: ${nv.keyVaultUrl}` : (nv.isSecret ? '***' : nv.value);
            await pool.query(`
                INSERT INTO access_control_lists (key, environment, value)
                VALUES ($1, $2, $3)
                ON CONFLICT (key, environment) DO UPDATE SET 
                    value = EXCLUDED.value;
            `, [nv.name, AZURE_CONFIG.environment, val]);
        }

        console.log(`🔗 Resolving ${capturedAppIds.size} potential App Identities...`);
        const realGuidCandidates: string[] = [];
        const appParams = new Map<string, { displayName: string, clientId: string }>();

        for (const cid of capturedAppIds) {
            if (nvMap.has(cid)) {
                const nv = nvMap.get(cid);
                if (nv.keyVaultUrl) {
                    appParams.set(cid, { clientId: cid, displayName: `KeyVault: ${nv.keyVaultUrl}` });
                } else if (!nv.isSecret && nv.value) {
                    const val = nv.value;
                    if (/^[0-9a-f]{8}-/i.test(val)) {
                        realGuidCandidates.push(val);
                        appParams.set(cid, { clientId: val, displayName: 'Pending Lookup...' });
                    }
                }
            } else if (/^[0-9a-f]{8}-/i.test(cid)) {
                realGuidCandidates.push(cid);
                appParams.set(cid, { clientId: cid, displayName: 'Pending Lookup...' });
            }
        }

        if (realGuidCandidates.length > 0) {
            const resolvedApps = await AzureService.fetchAppRegistrations(realGuidCandidates);
            for (const app of resolvedApps) {
                for (const [key, val] of appParams.entries()) {
                    if (val.clientId === app.appId) val.displayName = app.displayName;
                }
            }
        }

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
        process.exit(1);
    } finally {
        await pool.end();
    }
}
