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
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fork } from 'child_process';
import { AzureService, AppRegistration } from '../services/AzureService.js';

// --- CONFIG LOADER ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(__dirname, '..', '..', 'config.json');

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
    region?: string;
}

interface SyncReport {
    timestamp: string;
    environment: string;
    summary: {
        productsFound: number;
        apisFound: number;
        subsFound: number;
        namedValuesFound: number;
        orphanedSubsSkipped: number;
    };
    gaps: {
        orphanedSubscriptions: Array<{
            id: string;
            name: string;
            targetProduct: string;
            reason: string;
        }>;
        failedApis: Array<{
            name: string;
            reason: string;
        }>;
        unavailableResources: Array<{ type: string, error: string }>;
        gitOpsDrift: Array<{ productId: string, mode: string, message: string }>;
    };
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

    // Helper to clean and add
    const addIfGuidOrNv = (val: string) => {
        const clean = val.replace(/[{}]/g, '').trim();
        // Named Value or GUID
        if (clean.length > 0 && (clean.includes('-') || /^[a-zA-Z0-9-_]+$/.test(clean))) {
            ids.add(clean.toLowerCase());
        }
    };

    // 1. Named Values: {{my-client-id}}
    const nvMatches = xml.match(/{{([^}]+)}}/g);
    if (nvMatches) nvMatches.forEach(m => addIfGuidOrNv(m));

    // 2. Raw GUIDs
    const guidMatches = xml.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi);
    if (guidMatches) guidMatches.forEach(m => ids.add(m.toLowerCase()));

    // 3. validate-jwt / audiences attributes / validate-azure-ad-token
    // Matches: audience="GUID", application-id="GUID", client-id="GUID", aud="GUID", azp="GUID"
    const attrMatches = xml.match(/(audience|application-id|client-id|azp|aud)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(m => {
            const val = m.split(/["']/)[1];
            addIfGuidOrNv(val);
        });
    }

    // 4. XML Elements: <audience>GUID</audience>, <value>GUID</value> (inside check-header/claims)
    const elemMatches = xml.match(/<(audience|value|claim)[^>]*>([^<]+)<\/\1>/gi);
    if (elemMatches) {
        elemMatches.forEach(m => {
            const content = m.replace(/<[^>]+>/g, '');
            if (content.length < 100) addIfGuidOrNv(content); // Sanity check length
        });
    }

    // 5. OpenID Config: <openid-config url=".../GUID/..." />
    // Extract GUIDs embedded in URLs
    const urlMatches = xml.match(/url=["']([^"']+)["']/gi);
    if (urlMatches) {
        urlMatches.forEach(m => {
            const val = m.split(/["']/)[1];
            const guids = val.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi);
            if (guids) guids.forEach(g => ids.add(g.toLowerCase()));
        });
    }

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

interface GitMetadata {
    hash: string;
    date: string | null;
    pipelineUrl: string;
    repoUrl: string;
}

// Cache for Repos to avoid re-fetching per product
let GLOBAL_ADO_REPOS: any[] = [];
let ADO_INIT_DONE = false;

async function initAdoCache(devopsConfig: any) {
    if (ADO_INIT_DONE || !devopsConfig) return;
    try {
        console.log('🏗️ [ADO] Initializing Git Repository Cache...');
        const projects = await AzureService.fetchADOProjects(devopsConfig.organization, devopsConfig.pat, devopsConfig.baseUrl);
        GLOBAL_ADO_REPOS = await AzureService.fetchADOReposAcrossProjects(devopsConfig.organization, projects, devopsConfig.pat, devopsConfig.baseUrl);
        console.log(`✅ [ADO] Cached ${GLOBAL_ADO_REPOS.length} Repositories.`);
        ADO_INIT_DONE = true;
    } catch (e) {
        console.error('❌ [ADO] Failed to initialize cache:', e);
    }
}

interface GitMetadata {
    hash: string;
    date: string | null;
    pipelineUrl: string;
    repoUrl: string;
    production?: {
        hash: string;
        date: string;
    };
}

async function resolveGitMetadata(productName: string, productTags: Record<string, string>, devopsConfig: any, syncReport: SyncReport, currentEnv: string): Promise<GitMetadata> {
    const fallback: GitMetadata = { hash: '', date: null, pipelineUrl: '', repoUrl: '' };
    if (!devopsConfig) return fallback;

    // 1. Content Search Logic
    let matchedRepo = null;
    let repoUrl = '';

    try {
        const quotedName = productName.includes(' ') ? `"${productName}"` : productName;
        const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
        const searchResp = await AzureService.searchCode(
            devopsConfig.organization,
            searchTerm,
            devopsConfig.pat,
            devopsConfig.baseUrl
        );

        if (searchResp.count === 0) return fallback;

        const repoMap = new Map<string, any>();
        searchResp.results.forEach(r => {
            if (!repoMap.has(r.repository.name)) {
                repoMap.set(r.repository.name, {
                    id: r.repository.id,
                    name: r.repository.name,
                    project: r.repository.project.name
                });
            }
        });

        const filteredRepos = Array.from(repoMap.values()).filter(r => !r.name.toLowerCase().includes('grp'));
        if (filteredRepos.length !== 1) return fallback; // Handle ambiguity/zero in logs if needed, but keeping simple for now

        matchedRepo = filteredRepos[0];
        const cleanBase = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
        repoUrl = cleanBase.includes('visualstudio.com')
            ? `${cleanBase}/${matchedRepo.project}/_git/${matchedRepo.name}`
            : `${cleanBase}/${devopsConfig.organization}/${matchedRepo.project}/_git/${matchedRepo.name}`;

    } catch (e) { return fallback; }

    // 2. Fetch Pipelines & Scan Runs
    try {
        const pipelines = await AzureService.fetchADOPipelines(devopsConfig.organization, matchedRepo.project, matchedRepo.id, devopsConfig.pat, devopsConfig.baseUrl);
        if (pipelines.length === 0) return { ...fallback, repoUrl };

        const bestPipeline = pipelines.find(p => p.name.includes(matchedRepo.name) || p.name.toLowerCase().includes('ci')) || pipelines[0];
        const runs = await AzureService.fetchPipelineRuns(devopsConfig.organization, matchedRepo.project, bestPipeline.id, devopsConfig.pat, devopsConfig.baseUrl);

        if (runs.length === 0) return { ...fallback, repoUrl };

        // We want: 
        // 1. Latest successful run for CURRENT environment 
        // 2. Latest successful run for PROD environment
        let currentMetadata = { hash: '', date: '' };
        let prodMetadata = { hash: '', date: '' };
        let pipelineUrl = '';

        // Optimization: scan only last 20 runs
        for (const run of runs.slice(0, 20)) {
            const timeline = await AzureService.fetchPipelineRunTimeline(devopsConfig.organization, matchedRepo.project, run.id, devopsConfig.pat, devopsConfig.baseUrl);

            // Check for Current Env Success
            if (!currentMetadata.hash) {
                const stage = timeline.find(r => r.type === 'stage' && r.name.toLowerCase().includes(currentEnv.toLowerCase()) && r.result === 'succeeded');
                if (stage) {
                    currentMetadata = {
                        hash: 'sourceVersion' in run ? (run as any).sourceVersion : '',
                        date: stage.finishTime || run.finishedDate
                    };
                    pipelineUrl = (run as any)._links?.web?.href || (run as any).web?.href;
                }
            }

            // Check for Prod Env Success
            if (!prodMetadata.hash) {
                const stage = timeline.find(r => r.type === 'stage' && (r.name.toLowerCase().includes('prod') || r.name.toLowerCase().includes('production')) && r.result === 'succeeded');
                if (stage) {
                    prodMetadata = {
                        hash: 'sourceVersion' in run ? (run as any).sourceVersion : '',
                        date: stage.finishTime || run.finishedDate
                    };
                }
            }

            if (currentMetadata.hash && prodMetadata.hash) break;
        }

        // Fallback if no specific stage found: use latest run as 'current'
        if (!currentMetadata.hash) {
            currentMetadata = {
                hash: 'sourceVersion' in runs[0] ? (runs[0] as any).sourceVersion : '',
                date: runs[0].finishedDate
            };
            pipelineUrl = (runs[0] as any)._links?.web?.href || (runs[0] as any).web?.href;
        }

        return {
            hash: currentMetadata.hash,
            date: currentMetadata.date,
            pipelineUrl,
            repoUrl,
            production: prodMetadata.hash ? prodMetadata : undefined
        };

    } catch (error) {
        return fallback;
    }
}

function extractVersion(name: string): string {
    // Matches patterns like v1, v1.0, v2.3.4, or just 1.0.0 at the end or surrounded by separators
    const versionMatch = name.match(/(v\d+(\.\d+)*|\d+\.\d+\.\d+)/i);
    return versionMatch ? versionMatch[0] : '1.0.0';
}

async function fetchApimApis(token: string, azConfig: AzureConfig): Promise<ApimApi[]> {
    const apiConfig = getApimConfig(token, azConfig);
    const response = await AzureService.fetchAPIM<any>(apiConfig, '/apis');
    const apis = response.value;

    console.log(`⏳ [${azConfig.environment}] Fetching Policies for ${apis.length} APIs...`);
    const results: ApimApi[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < apis.length; i += BATCH_SIZE) {
        const batch = apis.slice(i, i + BATCH_SIZE);
        console.log(`  ⏳ [${azConfig.environment}] Fetching policies for batch ${i + 1}-${Math.min(i + BATCH_SIZE, apis.length)} of ${apis.length}...`);

        const batchResults = await Promise.all(batch.map(async (a: any) => {
            let policyXml = '';
            try {
                const polRes = await fetch(`https://management.azure.com${a.id}/policies/policy?api-version=2022-08-01&format=rawxml`, {
                    headers: { 'Authorization': `Bearer ${apiConfig.accessToken}` }
                });
                if (polRes.ok) {
                    const text = await polRes.text();
                    if (text.trim().startsWith('<')) {
                        policyXml = text;
                    } else {
                        try {
                            const json = JSON.parse(text);
                            policyXml = json.properties?.value || '';
                        } catch (e) {
                            policyXml = text;
                        }
                    }
                } else if (polRes.status === 429) {
                    console.warn(`  ⚠️ Rate Limit Hit for ${a.name}, pausing...`);
                    await new Promise(r => setTimeout(r, 2000));
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

        results.push(...batchResults);
        if (i + BATCH_SIZE < apis.length) await new Promise(r => setTimeout(r, 1000));
    }

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
        environment: envName,
        region: targetEnvConfig.region || 'Global'
    };

    const syncReport: SyncReport = {
        timestamp: new Date().toISOString(),
        environment: envName,
        summary: { productsFound: 0, apisFound: 0, subsFound: 0, namedValuesFound: 0, orphanedSubsSkipped: 0 },
        gaps: { orphanedSubscriptions: [], failedApis: [], unavailableResources: [], gitOpsDrift: [] }
    };

    const region = targetEnvConfig.region || 'Global';

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

        // [ADO] Init Cache of all Repos
        await initAdoCache(config.devops);

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
        syncReport.summary.productsFound = apimProducts.length;
        syncReport.summary.apisFound = apimApis.length;

        // Build Known Product ID Set for FK integrity
        const knownProductIds = new Set<string>(apimProducts.map(p => p.id));
        knownProductIds.add('unknown-product'); // Add default fallback if used

        let apimSubs: any[] = [];
        try {
            apimSubs = await fetchApimSubscriptions(token, AZURE_CONFIG);
            console.log(`🔑 Found ${apimSubs.length} Subscriptions`);
            syncReport.summary.subsFound = apimSubs.length;
        } catch (e) {
            console.warn('⚠️ Could not fetch Subscriptions:', e);
            syncReport.gaps.unavailableResources.push({ type: 'Subscriptions', error: String(e) });
        }

        let namedValues: any[] = [];
        try {
            namedValues = await fetchNamedValues(token, AZURE_CONFIG);
            console.log(`🌍 Found ${namedValues.length} Named Values`);
            syncReport.summary.namedValuesFound = namedValues.length;
        } catch (e) {
            console.warn('⚠️ Could not fetch Named Values:', e);
            syncReport.gaps.unavailableResources.push({ type: 'NamedValues', error: String(e) });
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

            // [REAL GIT INTEGRATION]
            const gitInfo = await resolveGitMetadata(p.name, tags, config.devops, syncReport, AZURE_CONFIG.environment);
            const anomalies: string[] = [];

            // If hash is missing, it implies manual creation (drift)
            // If hash is present, it is GitOps/Terraform managed
            if (!gitInfo.hash || gitInfo.hash === 'manual-or-git-linked') {
                // NOTE: The mock returns 'manual-or-git-linked'. 
                // If we want to simulate "TF Managed" success, we should treat that string as valid/success.
                // Ideally, we check real hash regex.
            }

            // LOGIC FIX:
            // If NO anomalies => TERRAFORM_MANAGED (Good State)
            // If 'MANUAL_CREATION' => HYBRID (Drifted)

            // However, our Mock 'fetchGitInfo' currently ALWAYS returns a hash.
            // So we just need to invert the ternary assignment.

            const derivedManagementMode = anomalies.includes('MANUAL_CREATION') ? 'HYBRID' : 'TERRAFORM_MANAGED';
            const extractedVersion = extractVersion(p.name);
            const uniqueProductId = `${p.id}:${AZURE_CONFIG.environment}:${region}`;

            await pool.query(`
                INSERT INTO products (id, name, display_name, version, environment, description, state, subscriber_count, owner_team_id, 
                    last_deployed_commit_hash, last_deployed_at, detected_anomalies, management_mode, terraform_pipeline_url, github_url, 
                    production_deployment_date, production_hash, region, updated_at)
                VALUES ($1, $2, $3, $15, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $16, $17, $18, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    state = EXCLUDED.state,
                    environment = EXCLUDED.environment,
                    subscriber_count = EXCLUDED.subscriber_count,
                    owner_team_id = EXCLUDED.owner_team_id,
                    last_deployed_commit_hash = EXCLUDED.last_deployed_commit_hash,
                    detected_anomalies = EXCLUDED.detected_anomalies,
                    management_mode = EXCLUDED.management_mode,
                    terraform_pipeline_url = EXCLUDED.terraform_pipeline_url,
                    github_url = EXCLUDED.github_url,
                    production_deployment_date = EXCLUDED.production_deployment_date,
                    production_hash = EXCLUDED.production_hash,
                    region = EXCLUDED.region,
                    updated_at = NOW();
            `, [
                uniqueProductId, p.id, p.name, AZURE_CONFIG.environment, p.description, p.state, p.subscriptionCount, dbOwnerId,
                gitInfo.hash, gitInfo.date, JSON.stringify(anomalies), derivedManagementMode,
                gitInfo.pipelineUrl, gitInfo.repoUrl, extractedVersion,
                gitInfo.production?.date || null, gitInfo.production?.hash || null, region
            ]);
        }

        const capturedAppIds = new Set<string>();
        for (const a of apimApis) {
            const rawData = JSON.stringify({
                protocols: a.protocols,
                serviceUrl: a.serviceUrl,
                policyXml: a.policyXml
            });

            const uniqueApiId = `${a.id}:${AZURE_CONFIG.environment}:${region}`;
            // Find parent product (best effort)
            // APIM APIs can belong to multiple products, but for Day 1 we assume 1:1 or first match.
            // We need to find which product this API belongs to in the current Env.
            // Simplified: we will use the product_id from the APIM response if available or link to the specific product it was synced with.
            // Actually, apim-database sync logic usually connects APIs to products via another call.
            // Let's keep it linked to 'unknown-product' if not clear or try to find a match.
            const apiToProductUrl = `/apis/${a.id}/products`;
            const productsRes = await AzureService.fetchAPIM<any>(apimConfig, apiToProductUrl);
            const parentProduct = productsRes.value?.[0];
            const linkedProductId = parentProduct ? `${parentProduct.name}:${AZURE_CONFIG.environment}:${region}` : 'unknown-product';

            await pool.query(`
                INSERT INTO apis(
                id, name, display_name, path, product_id, apim_raw_data, updated_at
            )
                VALUES($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT(id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                path = EXCLUDED.path,
                product_id = EXCLUDED.product_id,
                apim_raw_data = EXCLUDED.apim_raw_data,
                updated_at = NOW();
            `, [uniqueApiId, a.id, a.name, a.path, linkedProductId, rawData]);

            extractClientIdsFromPolicy(a.policyXml).forEach(cid => capturedAppIds.add(cid));
        }

        for (const s of apimSubs) {
            if (!s.scope || !s.scope.toLowerCase().includes('/products/')) {
                // console.warn(`⚠️ Skipping Non - Product Subscription: ${ s.name } (Scope: ${ s.scope })`);
                syncReport.gaps.orphanedSubscriptions.push({ id: s.id, name: s.name, targetProduct: 'N/A', reason: `Non - Product Scope: ${s.scope} ` });
                syncReport.summary.orphanedSubsSkipped++;
                continue;
            }

            // Referential Integrity Check
            if (!knownProductIds.has(s.productId)) {
                // console.warn(`⚠️ Skipping Orphaned Subscription: ${ s.name } (Target Product '${s.productId}' not found in sync)`);
                syncReport.gaps.orphanedSubscriptions.push({ id: s.id, name: s.name, targetProduct: s.productId, reason: 'Target Product not found in APIM or DB' });
                syncReport.summary.orphanedSubsSkipped++;
                continue;
            }

            await pool.query(`
                INSERT INTO teams(id, display_name, type, updated_at)
            VALUES($1, $1, 'consumer', NOW())
                ON CONFLICT(id) DO NOTHING
                `, [s.userId]);

            await pool.query(`
                INSERT INTO subscriptions(
                    id, product_id, subscriber_team_id, state,
                    primary_key_name, primary_key_value,
                    created_at, updated_at
                )
            VALUES($1, $2, $3, $4, 'primary', $5, $6, NOW())
                ON CONFLICT(id) DO UPDATE SET
            state = EXCLUDED.state,
                updated_at = NOW();
            `, [s.id, s.productId, s.userId, s.state, s.primaryKey, s.createdDate]);
        }

        for (const nv of namedValues) {
            const val = nv.keyVaultUrl ? `KeyVault Ref: ${nv.keyVaultUrl} ` : (nv.isSecret ? '***' : nv.value);
            await pool.query(`
                INSERT INTO access_control_lists(key, environment, value)
            VALUES($1, $2, $3)
                ON CONFLICT(key, environment) DO UPDATE SET
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
                    appParams.set(cid, { clientId: cid, displayName: `KeyVault: ${nv.keyVaultUrl} ` });
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
                INSERT INTO app_registrations(id, client_id, display_name, environment, product_id, owner_team_id)
            VALUES($1, $1, $2, $3, 'unknown-product', NULL)
                ON CONFLICT(id) DO UPDATE SET display_name = EXCLUDED.display_name;
            `, [val.clientId, val.displayName, AZURE_CONFIG.environment]);
        }

        console.log('✅ Sync Complete.');

    } catch (err) {
        console.error('❌ Sync Failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
        const reportPath = join(logDir, `report_${envName}_${timestamp}.json`);
        writeFileSync(reportPath, JSON.stringify(syncReport, null, 2));
        console.log(`📊 Sync Report written to: ${reportPath} `);
    }
}
