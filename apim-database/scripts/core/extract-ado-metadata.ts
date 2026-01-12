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
    console.log(`🔐 [AUTH] Initializing ADO Bearer Token (Resource: Azure DevOps)...`);
    let bearerToken: string | undefined = undefined;
    try {
        bearerToken = await AzureService.getAzureAccessToken(AzureService.ADO_RESOURCE_ID);
        console.log(`   ✅ Azure CLI Token Acquired.`);
    } catch (e: any) {
        console.warn(`   ⚠️  Azure CLI login failed, using PAT only: ${e.message}`);
    }

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
            console.log(`\n🔍 Processing: ${prod.name}`);
            const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };
            try {
                const cleanProd = sanitize(prod.name);
                const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
                const searchResp = await AzureService.searchCode(devops.organization, quotedName, devops.pat, devops.baseUrl, bearerToken);

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

                // --- PIPELINE DISCOVERY (SYNCED WITH debug-git-logic.ts Step 2) ---
                const safeFetch = async (fn: () => Promise<any[]>, label: string) => {
                    try { return await fn(); } catch (e: any) {
                        if (verbose) console.warn(`      ⚠️  [Discovery] ${label} lookup failed: ${e.message}`);
                        return [];
                    }
                };

                const [yamlPipes, buildDefs, releaseDefs, projPipes, projBuilds] = await Promise.all([
                    safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken), 'YAML Pipelines'),
                    safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken), 'Build Definitions'),
                    safeFetch(() => AzureService.fetchADOReleaseDefinitions(devops.organization, projectId, devops.pat, devops.baseUrl, bearerToken), 'Release Definitions'),
                    safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'Proj YAML'),
                    safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'Proj Build')
                ]);

                // --- SURGICAL DISCOVERY (Synced with debug-git-logic.ts) ---
                const surgicalPipes: any[] = [];
                const searchEnvs = ['PROD', 'STAGE', 'QA', 'DEV'];
                for (const envName of searchEnvs) {
                    try {
                        const envUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(projectId)}/_apis/distributedtask/environments?name=${envName}`;
                        const authHeader = AzureService.getAuthHeader(devops.pat, bearerToken);
                        const resp = await fetch(envUrl, { headers: { 'Authorization': authHeader, 'Accept': 'application/json' } });
                        if (resp.ok) {
                            const data = await resp.json() as { count: number; value: any[] };
                            const match = data.value.find((e: any) => e.name.toUpperCase() === envName);
                            if (match) {
                                const envDeploys = await AzureService.fetchEnvironmentDeployments(devops.organization, projectId, match.id, devops.pat, devops.baseUrl, bearerToken);
                                for (const d of envDeploys) {
                                    if (d.definition?.id) {
                                        surgicalPipes.push({ ...d.definition, type: 'Surgical (Live)' });
                                    }
                                }
                                if (surgicalPipes.length > 0) break;
                            }
                        }
                    } catch (e) { }
                }

                const combinedPipelines = [
                    ...yamlPipes.map(p => ({ ...p, type: 'YAML' })),
                    ...buildDefs.map(p => ({ ...p, type: 'Classic Build' })),
                    ...releaseDefs.map(r => ({ ...r, type: 'Classic Release', isRelease: true })),
                    ...projPipes.map(p => ({ ...p, type: 'YAML (Proj)' })),
                    ...projBuilds.map(p => ({ ...p, type: 'Classic Build (Proj)' })),
                    ...surgicalPipes
                ];

                const seen = new Set();
                const uniquePipelines = combinedPipelines.filter(p => {
                    const key = `${p.type}-${p.id}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                const pipeCandidates = uniquePipelines.map((p: any) => {
                    const cleanPipe = sanitize(p.name);
                    const folder = sanitize(p.folder || '');
                    let score = 0;
                    if (cleanPipe === cleanProd) score += 100;
                    if (cleanPipe.includes(cleanProd)) score += 50;
                    if (folder.includes(cleanProd)) score += 20;
                    if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                    if (cleanPipe.includes('apim')) score += 5;
                    if (cleanPipe === 'main' || cleanPipe === 'ci') score -= 20;
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

                // --- DEPLOYMENT EXTRACTION (SYNCED WITH debug-git-logic.ts Step 4) ---
                console.log(`   ⏳ Attempting surgical strikes for ${matchedPipeline.name} (ID: ${matchedPipeline.id})...`);
                for (const envName of envsToSync) {
                    let deploy: any = null;
                    console.log(`      🔎 Checking ${envName}...`);

                    // 1. Surgical Strike
                    if ((matchedPipeline as any).isRelease) {
                        const releases = await AzureService.fetchADOReleases(devops.organization, projectId, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
                        const latest = releases.find(r => r.environments?.some(e => e.name.toUpperCase() === envName.toUpperCase() && ['succeeded', 'partiallysucceeded'].includes((e.status || '').toLowerCase())));
                        if (latest) {
                            const env = latest.environments.find(e => e.name.toUpperCase() === envName.toUpperCase());
                            deploy = {
                                build: { sourceVersion: latest.artifacts?.[0]?.definitionReference?.version?.id },
                                finishTime: env?.deploySteps?.[0]?.queuedOn || latest.modifiedOn,
                                sourceBranch: latest.artifacts?.[0]?.definitionReference?.branch?.name || 'unknown',
                                requestedFor: latest.createdBy,
                                url: latest._links?.web?.href
                            };
                        }
                    } else {
                        deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, projectId, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
                    }

                    if (deploy) {
                        if (verbose) console.log(`      ℹ️ [DEBUG] Raw deploy object found (ID: ${deploy.id})`);

                        // INITIAL HASH CAPTURE (Expansive fields)
                        let commitHash = deploy.build?.sourceVersion ||
                            deploy.build?.sourceVersionID ||
                            deploy.owner?.sourceVersion ||
                            deploy.owner?.sourceVersionID ||
                            deploy.owner?.commitId ||
                            (deploy.owner?.triggerInfo ? (deploy.owner.triggerInfo['ci.sourceSha'] || deploy.owner.triggerInfo['ci.sourceVersion']) : null);

                        let fullDetails = deploy;

                        const ownerId = deploy.owner?.id || deploy.build?.id || deploy.id;
                        if (ownerId && ownerId !== 'unknown') {
                            if (verbose) console.log(`      📡 Fetching full build details (ID: ${ownerId}) for metadata...`);
                            const details = await AzureService.fetchADOBuild(devops.organization, projectId, ownerId, devops.pat, devops.baseUrl, bearerToken);
                            if (details) {
                                fullDetails = details;

                                // --- MULTI-REPO FIX ---
                                // If the build's primary repo is NOT our matched repo, look for the correct version in resources
                                if (details.repository?.name && meta.repository?.name &&
                                    details.repository.name.toLowerCase() !== meta.repository.name.toLowerCase()) {

                                    if (verbose) console.log(`      ⚠️  Build primary repo (${details.repository.name}) != target (${meta.repository.name}). Scanning resources...`);

                                    if (details.resources?.repositories) {
                                        const targetRepoRes = Object.values(details.resources.repositories).find((r: any) =>
                                            r.repository?.name?.toLowerCase() === meta.repository!.name.toLowerCase() ||
                                            r.repository?.id === meta.repository!.id
                                        );
                                        if ((targetRepoRes as any)?.version) {
                                            commitHash = (targetRepoRes as any).version;
                                            if (verbose) console.log(`      🎯 [Multi-Repo] Found version from target repository (${meta.repository.name}): ${commitHash}`);
                                        }
                                    }
                                }

                                // Secondary Fallback if still unset
                                commitHash = commitHash || details.sourceVersion || details.sourceVersionID || details.commitId;
                            }
                        }

                        if (commitHash && commitHash !== 'unknown') {
                            const author = fullDetails.requestedFor?.displayName ||
                                fullDetails.requestedBy?.displayName ||
                                fullDetails.lastChangedBy?.displayName ||
                                deploy.requestedFor?.displayName ||
                                'Unknown';

                            const rawBranch = fullDetails.sourceBranch ||
                                deploy.sourceBranch ||
                                deploy.build?.sourceBranch ||
                                'unknown';

                            const branch = rawBranch.replace('refs/heads/', '');
                            const message = fullDetails.triggerInfo?.['ci.message'] || fullDetails.comment || deploy.comment || 'No message';

                            meta.deployments[envName] = {
                                hash: commitHash,
                                date: deploy.finishTime || deploy.startTime || fullDetails.finishTime || fullDetails.startTime || new Date().toISOString(),
                                branch,
                                author,
                                message,
                                url: fullDetails._links?.web?.href || deploy._links?.web?.href || deploy.url
                            };
                            console.log(`      🎯 ${envName.padEnd(5)}: Surgical Hit! Captured ${commitHash.substring(0, 7)} (Auth: ${author})`);
                        } else {
                            console.warn(`      ⚠️  ${envName.padEnd(5)}: Deployment found but commit hash is missing/unknown.`);
                        }
                    }
                }

                // 2. Scan Fallback (if envs missing)
                const missingEnvs = envsToSync.filter(e => !meta.deployments[e]);
                if (missingEnvs.length > 0) {
                    console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to paginated timeline scan (Depth: 100)...`);
                    const timelineCache = new Map<number, any[]>();
                    let skip = 0;
                    const pageSize = 20;
                    const maxDepth = 100;

                    while (Object.keys(meta.deployments).length < envsToSync.length && skip < maxDepth) {
                        const builds = await AzureService.fetchBuildsByDefinition(devops.organization, projectId, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
                        console.log(`   📡 [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds...`);

                        if (builds.length === 0) break;

                        for (const run of builds) {
                            if (Object.keys(meta.deployments).length === envsToSync.length) break;
                            if (!timelineCache.has(run.id)) {
                                timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectId, run.id, devops.pat, devops.baseUrl, bearerToken));
                            }
                            const timeline = timelineCache.get(run.id)!;
                            if (!timeline || timeline.length === 0) {
                                if (verbose) console.log(`      ⚠️ Build ${run.id} has no timeline records.`);
                                continue;
                            }

                            for (const envName of envsToSync) {
                                if (meta.deployments[envName]) continue;

                                // Pass 1: Container match (Stage/Job/Phase)
                                let record = timeline.find((t: any) => {
                                    const type = (t.type || t.recordType || '').toLowerCase();
                                    const isContainer = ['stage', 'job', 'phase'].includes(type);
                                    const cleanName = sanitize(t.name || '');
                                    const cleanEnv = sanitize(envName);
                                    const nameMatches = cleanName.includes(cleanEnv) || cleanEnv.includes(cleanName);
                                    const isSuccess = ['succeeded', 'partiallysucceeded'].includes((t.result || '').toLowerCase());
                                    const isCompleted = (t.status || '').toLowerCase() === 'completed';

                                    if (verbose && (nameMatches || t.name?.toLowerCase().includes(envName.toLowerCase()))) {
                                        console.log(`      🔍 [Scan Pass 1] ${envName} vs "${t.name}" | Type: ${type} | Result: ${t.result} | Match: ${nameMatches}`);
                                    }
                                    return isContainer && nameMatches && isSuccess && isCompleted;
                                });

                                // Pass 2: Generous match
                                if (!record) {
                                    record = timeline.find((t: any) => {
                                        const cleanName = sanitize(t.name || '');
                                        const cleanEnv = sanitize(envName);
                                        const nameMatches = cleanName.includes(cleanEnv) || cleanEnv.includes(cleanName);
                                        const isSuccess = ['succeeded', 'partiallysucceeded'].includes((t.result || '').toLowerCase());
                                        const isCompleted = (t.status || '').toLowerCase() === 'completed';

                                        if (verbose && (nameMatches || t.name?.toLowerCase().includes(envName.toLowerCase()))) {
                                            console.log(`      🔍 [Scan Pass 2] ${envName} vs "${t.name}" | Result: ${t.result} | Match: ${nameMatches}`);
                                        }
                                        return nameMatches && isSuccess && isCompleted;
                                    });
                                }

                                if (record) {
                                    if (verbose) console.log(`      ℹ️ [DEBUG] Scanner matched build ${run.id}. Raw run: ${JSON.stringify(run)}`);
                                    const hash = run.sourceVersion || run.sourceVersionID || 'unknown';
                                    const author = run.requestedFor?.displayName || run.requestedBy?.displayName || 'Unknown';
                                    const branch = (run.sourceBranch || 'unknown').replace('refs/heads/', '');
                                    const message = run.triggerInfo?.['ci.message'] || run.comment || 'No message';

                                    meta.deployments[envName] = {
                                        hash,
                                        date: record.finishTime || run.finishedDate || new Date().toISOString(),
                                        branch,
                                        author,
                                        message,
                                        url: run._links?.web?.href
                                    };
                                    console.log(`      📍 ${envName.padEnd(5)}: Scanner Hit! Captured ${hash.substring(0, 7)} (Auth: ${author})`);
                                }
                            }
                        }
                        skip += pageSize;
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
