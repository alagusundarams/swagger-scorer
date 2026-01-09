/**
 * @fileoverview PART 2: ADO METADATA EXTRACTION
 * 
 * PURPOSE:
 * Consumes the product inventory from Part 1 or the existing DB
 * and performs targeted ADO discovery.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Load .env file if present
import { AzureService } from '../services/AzureService.js';
import pkg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Pool } = pkg;

// --- CONFIG LOADER ---
function loadConfig() {
    // Robust resolution regardless of CWD
    const scriptDir = __dirname;
    const repoRoot = resolve(scriptDir, '..', '..', '..');
    const dbRoot = resolve(scriptDir, '..', '..');

    console.log(`\n🔍 [Debug] Loading Configuration...`);
    console.log(`   ENV ACCOUNTS: ORG=${process.env.AZURE_DEVOPS_ORG || '(empty)'}, PAT=${process.env.AZURE_DEVOPS_PAT ? '(*******)' : '(missing)'}`);

    const priorities = [
        join(repoRoot, 'config.json'),                     // 1. Root config
        join(dbRoot, 'config.json'),                       // 2. DB config (Local to these scripts - High Priority)
        join(repoRoot, 'apim-self-service-backend', 'config.json') // 3. Backend config (Fallback)
    ];

    for (const p of priorities) {
        if (existsSync(p)) {
            try {
                const content = JSON.parse(readFileSync(p, 'utf8'));
                // Simple validation to skip placeholders if possible
                if (content.devops?.pat && content.devops.pat !== 'your-read-only-pat') {
                    console.log(`   ✅ [Config] Valid config found at: ${p}`);
                    console.log(`       -> Org: ${content.devops.organization}`);
                    console.log(`       -> PAT: ${content.devops.pat.substring(0, 4)}... (Masked)`);
                    return content;
                }
                console.log(`   🔸 [Config] Found but INVALID/PLACEHOLDER at: ${p}`);
                // Keep track of the fallback (likely placeholder)
                if (!process.env.FOUND_CONFIG) process.env.FOUND_CONFIG = p;
            } catch (e) {
                console.warn(`   ⚠️ [Config] Failed to parse ${p}`);
            }
        } else {
            console.log(`   ✖️ [Config] Not found at: ${p}`);
        }
    }

    // Fallback to the first found one (even if placeholder) to avoid total crash
    if (process.env.FOUND_CONFIG) {
        console.warn(`   ⚠️ [Config] Defaulting to placeholder: ${process.env.FOUND_CONFIG}`);
        return JSON.parse(readFileSync(process.env.FOUND_CONFIG, 'utf8'));
    }

    return {};
}

const config = loadConfig();

// --- ARGS ---
const args = process.argv.slice(2);
const targetEnv = args.find(a => a.startsWith('--env='))?.split('=')[1]?.toUpperCase();
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const sourceMode = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'inventory'; // 'inventory' or 'db'
const verbose = !args.includes('--quiet');
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

if (config.devops?.pat) {
    const masked = config.devops.pat.substring(0, 4) + '...' + config.devops.pat.substring(config.devops.pat.length - 4);
    console.log(`🔐 [Auth] Using PAT: ${masked}`);
}

interface ProductIdentity {
    id: string;
    name: string;
    environments: string[];
}

interface ADOMetadata {
    productId: string;
    productName: string;
    repository?: { id: string; name: string; project: string; projectId: string };
    pipeline?: { id: number; name: string };
    deployments: Record<string, { hash: string; date: string, branch?: string, author?: string, message?: string, url?: string }>;
    discoveredSpecs?: string[];
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

async function main() {
    console.log(`🚀 [PART 2] Starting ADO Metadata Extraction (Source: ${sourceMode})...\n`);
    if (targetEnv) console.log(`🎯 Filtering for Environment: ${targetEnv}\n`);

    // --- CONFIG OVERRIDES (ENV VARS) ---
    // Critical: Prioritize Env Vars (AZURE_DEVOPS_PAT) as these are often used in Debug/CI
    const devops = {
        ...config.devops,
        organization: (process.env.AZURE_DEVOPS_ORG || config.devops?.organization || '').trim(),
        pat: (process.env.AZURE_DEVOPS_PAT || config.devops?.pat || '').trim(),
        baseUrl: (process.env.AZURE_DEVOPS_URL || config.devops?.baseUrl || 'https://dev.azure.com').trim()
    };

    // SANITIZE: Remove trailing slashes to prevent "https://org.visualstudio.com//repo" errors
    if (devops.organization) devops.organization = devops.organization.replace(/\/+$/, '').replace(/^\/+/, '');
    if (devops.baseUrl) devops.baseUrl = devops.baseUrl.replace(/\/+$/, '');

    if (!devops || !devops.pat || devops.pat === 'your-read-only-pat') {
        console.error("❌ DevOps PAT missing or invalid (checked config.json and AZURE_DEVOPS_PAT env var)");
        process.exit(1);
    }

    // --- IDENTITY SETUP ---
    console.log(`🔐 [AUTH] Forced PAT Authentication (Skipping Azure CLI to avoid 401s)...`);
    let bearerToken: string | undefined = undefined;
    // try {
    //     bearerToken = await AzureService.getAzureAccessToken();
    //     console.log(`   ✅ Azure CLI Token Acquired.`);
    // } catch (e: any) {
    //     console.warn(`   ⚠️  Azure CLI login failed, using PAT only: ${e.message}`);
    // }

    // --- CONNECTION VERIFICATION WITH FAILOVER ---
    try {
        const targetUrl = devops.baseUrl.includes('visualstudio.com')
            ? devops.baseUrl
            : `${devops.baseUrl}/${devops.organization}`;
        console.log(`   📡 Connecting to: ${targetUrl}...`);

        const connection = await AzureService.verifyAdoConnection(devops.organization, devops.pat, devops.baseUrl, bearerToken);
        console.log(`   ✅ Connection Verified: ${connection.authenticatedUser?.customDisplayName || connection.authenticatedUser?.id}`);
    } catch (err: any) {
        // FAILOVER LOGIC: If default dev.azure.com failed, try legacy visualstudio.com
        const isDefaultUrl = devops.baseUrl.includes('dev.azure.com');
        if (isDefaultUrl) {
            console.warn(`   ⚠️  Default URL (${devops.baseUrl}) failed. Attempting legacy 'visualstudio.com' failover...`);
            const legacyUrl = `https://${devops.organization}.visualstudio.com`;
            try {
                const connection = await AzureService.verifyAdoConnection(devops.organization, devops.pat, legacyUrl, bearerToken);
                console.log(`   ✅ FALLBACK SUCCESS: Connected via ${legacyUrl}`);
                console.log(`   🔄 Updating runtime config to use Legacy URL.`);
                devops.baseUrl = legacyUrl; // <--- CRITICAL UPDATE
            } catch (retryErr: any) {
                console.error(`❌ [AUTH] Both Default and Legacy connection attempts failed.`);
                console.error(`   1. ${devops.baseUrl} -> ${err.message}`);
                console.error(`   2. ${legacyUrl} -> ${retryErr.message}`);
                process.exit(1);
            }
        } else {
            console.error(`❌ [AUTH] Verification failed: ${err.message}`);
            process.exit(1);
        }
    }

    let inventory: ProductIdentity[] = [];

    // 1. Load Discovery Source
    if (sourceMode === 'db') {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || (config.database ? config.database.url : undefined),
            ...(typeof config.database === 'object' ? config.database : {})
        });
        try {
            const res = await pool.query(`
                SELECT id, name, array_agg(DISTINCT environment) as environments 
                FROM products 
                GROUP BY id, name
            `);
            inventory = res.rows.map(row => ({
                id: row.id,
                name: row.name,
                environments: row.environments
            }));
            console.log(`   ✅ Loaded ${inventory.length} logical products from DB.`);
        } catch (err: any) {
            console.error(`❌ DB Connection failed: ${err.message}`);
            process.exit(1);
        } finally {
            await pool.end();
        }
    } else {
        const inventoryDir = existsSync(join(process.cwd(), 'scripts', 'data'))
            ? join(process.cwd(), 'scripts', 'data')
            : join(process.cwd(), 'apim-database', 'scripts', 'data');
        const inventoryPath = join(inventoryDir, 'apim-inventory.json');
        if (!existsSync(inventoryPath)) {
            console.error(`❌ Inventory file not found: ${inventoryPath}`);
            process.exit(1);
        }
        inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    }

    if (productNameArg) {
        inventory = inventory.filter((p: ProductIdentity) => p.name.toLowerCase() === productNameArg.toLowerCase() || p.id.toLowerCase() === productNameArg.toLowerCase());
    }
    if (targetEnv) {
        inventory = inventory.filter((p: ProductIdentity) => p.environments.map(e => e.toUpperCase()).includes(targetEnv));
    }
    if (limit > 0) inventory = inventory.slice(0, limit);

    console.log(`📊 Processing ${inventory.length} products...\n`);

    // 3. Discovery Loop with Batching
    const results: ADOMetadata[] = [];
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const BATCH_SIZE = 5; // Safe concurrency

    for (let i = 0; i < inventory.length; i += BATCH_SIZE) {
        const batch = inventory.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(inventory.length / BATCH_SIZE)} (${batch.length} products)`);

        await Promise.all(batch.map(async (prod) => {
            const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };
            try {
                const cleanProd = sanitize(prod.name);
                const searchTerm = `"${prod.name}" (ext:tf OR ext:tfvars)`;
                const searchResp = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl, bearerToken);

                if (!searchResp || searchResp.count === 0) {
                    meta.status = 'REPO_MISSING';
                    results.push(meta);
                    return;
                }

                const repoCandidates = searchResp.results
                    .filter((r: any) => r.repository?.name)
                    .map((r: any) => {
                        const cleanRepo = sanitize(r.repository.name);
                        let score = 0;
                        if (cleanRepo === cleanProd) score += 100;
                        else if (cleanRepo.includes(cleanProd)) score += 50;
                        if (cleanRepo.includes('grp')) score -= 20;
                        if (cleanRepo.includes('shared')) score -= 30;
                        return { repo: r.repository, score };
                    }).sort((a: any, b: any) => b.score - a.score);

                if (repoCandidates.length === 0) {
                    meta.status = 'REPO_MISSING';
                    results.push(meta);
                    return;
                }

                const repo = repoCandidates[0].repo;
                let project = repo.project?.name || "Unknown";
                let projectId = repo.project?.id || "";

                if (project === "Unknown" || !projectId) {
                    const repoDetails = await AzureService.fetchRepoById(devops.organization, repo.id, devops.pat, devops.baseUrl, bearerToken);
                    project = repoDetails.project.name;
                    projectId = repoDetails.project.id;
                }

                meta.repository = { id: repo.id, name: repo.name, project, projectId };

                const pipelines = await AzureService.fetchADOPipelines(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken);
                const pipeCandidates = pipelines.map((p: any) => {
                    const cleanPipe = sanitize(p.name);
                    let score = 0;
                    if (cleanPipe.includes(cleanProd)) score += 50;
                    if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                    return { pipe: p, score };
                }).sort((a: any, b: any) => b.score - a.score);

                if (pipeCandidates.length === 0 || pipeCandidates[0].score < 10) {
                    meta.status = 'PIPELINE_MISSING';
                    results.push(meta);
                    return;
                }

                const matchedPipeline = pipeCandidates[0].pipe;
                meta.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
                meta.status = 'MATCHED';

                const envsToSync = targetEnv ? [targetEnv] : prod.environments;

                // --- SURGICAL SYNC (EXACT COPY FROM debug-git-logic.ts) ---
                for (const envName of envsToSync) {
                    console.log(`      🔎 Checking ${envName}...`);

                    // Step 1: Find environment ID by name (EXACT MATCH to debug script line 222)
                    const envUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(projectId)}/_apis/distributedtask/environments?name=${envName}&api-version=7.1`;
                    let envId: number | null = null;

                    try {
                        const authHeader = AzureService.getAuthHeader(devops.pat, bearerToken);
                        const resp = await fetch(envUrl, {
                            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
                        });
                        if (resp.ok) {
                            const data = await resp.json() as { count: number; value: any[] };
                            const match = data.value.find((e: any) => e.name.toUpperCase() === envName.toUpperCase());
                            if (match) {
                                envId = match.id;
                                console.log(`      ✅ Found environment ${envName} (ID: ${envId})`);

                                // Step 2: Fetch ALL deployments for this environment (EXACT MATCH to debug script line 231)
                                const envDeploys = await AzureService.fetchEnvironmentDeployments(
                                    devops.organization, projectId, envId, devops.pat, devops.baseUrl, bearerToken
                                );
                                console.log(`      ✅ Found ${envDeploys.length} recent deployments in ${envName}.`);

                                // Step 3: Find deployment matching our pipeline (EXACT MATCH to debug script line 234-242)
                                for (const d of envDeploys) {
                                    if (d.definition && d.definition.id === matchedPipeline.id) {
                                        let commitHash = d.definition?.sourceVersion || d.build?.sourceVersion;
                                        let fullDetails = d;

                                        // Fetch full build details for metadata (EXACT MATCH to debug script line 333-340)
                                        const ownerId = d.owner?.id || d.build?.id;
                                        if (ownerId) {
                                            console.log(`      📡 Fetching full build details (ID: ${ownerId}) for metadata...`);
                                            const details = await AzureService.fetchADOBuild(devops.organization, projectId, ownerId, devops.pat, devops.baseUrl, bearerToken);
                                            if (details) {
                                                fullDetails = details;
                                                commitHash = commitHash || details.sourceVersion;
                                            }
                                        }

                                        if (commitHash && commitHash !== 'unknown') {
                                            const author = fullDetails.requestedFor?.displayName ||
                                                fullDetails.requestedBy?.displayName ||
                                                fullDetails.lastChangedBy?.displayName ||
                                                d.requestedFor?.displayName || 'Unknown';

                                            const rawBranch = fullDetails.sourceBranch || d.sourceBranch || 'unknown';
                                            const branch = rawBranch.replace('refs/heads/', '');

                                            const message = fullDetails.triggerInfo?.['ci.message'] ||
                                                fullDetails.comment ||
                                                fullDetails.description || 'No message';

                                            meta.deployments[envName] = {
                                                hash: commitHash,
                                                date: d.finishTime || d.startTime || fullDetails.finishTime || fullDetails.startTime || new Date().toISOString(),
                                                branch,
                                                author,
                                                message,
                                                url: fullDetails._links?.web?.href || d.url
                                            };
                                            console.log(`      🎯 ${envName.padEnd(5)}: Found deployment ${commitHash.substring(0, 7)}`);
                                            break; // Found deployment for this env, move to next
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e: any) {
                        console.warn(`      ⚠️ Environment lookup for ${envName} failed: ${e.message}`);
                    }
                }
                results.push(meta);
                if (verbose) console.log(`   ✅ ${prod.name}: Synced ${Object.keys(meta.deployments).length}/${envsToSync.length} environments.`);

            } catch (e: any) {
                console.error(`   ❌ Error processing ${prod.name}: ${e.message}`);
                results.push(meta);
            }
        }));
    }

    const dataDir = existsSync(join(process.cwd(), 'scripts', 'data'))
        ? join(process.cwd(), 'scripts', 'data')
        : join(process.cwd(), 'apim-database', 'scripts', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    // --- GENERATE MISSING REPORT ---
    const missingStats = {
        repoMissing: results.filter(r => r.status === 'REPO_MISSING').map(r => r.productName),
        pipelineMissing: results.filter(r => r.status === 'PIPELINE_MISSING').map(r => r.productName),
        noDeployments: results.filter(r => r.status === 'MATCHED' && Object.keys(r.deployments).length === 0).map(r => r.productName),
        stats: {
            totalProcessed: results.length,
            matchedAndSynced: results.filter(r => r.status === 'MATCHED' && Object.keys(r.deployments).length > 0).length
        }
    };

    const reportPath = join(dataDir, 'ado-missing-report.json');
    writeFileSync(reportPath, JSON.stringify(missingStats, null, 2));

    const outputPath = join(dataDir, 'ado-metadata.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\n✅ ADO Metadata Extraction Complete! Saved to: ${outputPath}`);
    console.log(`\n📋 Missing Report Generated:`);
    if (missingStats.repoMissing.length > 0) console.log(`   ❌ Repo Missing: ${missingStats.repoMissing.length}`);
    if (missingStats.pipelineMissing.length > 0) console.log(`   ❌ Pipeline Missing: ${missingStats.pipelineMissing.length}`);
    if (missingStats.noDeployments.length > 0) console.log(`   ❌ No Deployments Found: ${missingStats.noDeployments.length}`);
    console.log(`   📄 Saved to: ${reportPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
