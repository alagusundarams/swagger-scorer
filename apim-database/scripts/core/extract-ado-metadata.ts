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
    console.log(`🔐 [AUTH] Initializing ADO Bearer Token via Azure CLI...`);
    let bearerToken: string | undefined = undefined;
    try {
        bearerToken = await AzureService.getAdoAccessToken();
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

    // Helper functions and state
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const results: ADOMetadata[] = [];
    const repoLessProducts: { name: string; searchTerm: string }[] = [];
    const allDiscoveredRepos = new Set<string>();

    // Batch processing setup
    const batchSize = limit > 0 ? limit : inventory.length;
    const batch = inventory.slice(0, batchSize);
    console.log(`\n📦 Processing ${batch.length} product(s)...\n`);

    await Promise.all(batch.map(async (prod) => {
        console.log(`\n🔍 Processing: ${prod.name}`);
        const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };
        try {
            const cleanProd = sanitize(prod.name);
            const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
            const searchResp = await AzureService.searchCode(devops.organization, quotedName, devops.pat, devops.baseUrl, bearerToken);

            if (!searchResp || searchResp.count === 0) {
                meta.status = 'REPO_MISSING';
                repoLessProducts.push({ name: prod.name, searchTerm: quotedName });
                results.push(meta);
                return;
            }

            // Track all repos discovered during search
            searchResp.results.forEach((r: any) => {
                if (r.repository?.name) allDiscoveredRepos.add(r.repository.name);
            });

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
                repoLessProducts.push({ name: prod.name, searchTerm: quotedName });
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

            // STRATEGY 1: REPO-NAME-BASED DISCOVERY (Primary, +400)
            const repoBasedPipes: any[] = [];
            try {
                const searchTerm = repo.name.replace(/-IaC$/i, '').replace(/-Deploy$/i, '').replace(/-GitOps$/i, '');
                const productSearchTerm = prod.name.replace(/-IaC$/i, '').replace(/-Deploy$/i, '');

                const [yamlAll, buildAll] = await Promise.all([
                    safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'YAML All'),
                    safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'Build All')
                ]);

                const allPipes = [...yamlAll, ...buildAll];
                const cleanSearch = sanitize(searchTerm);
                const cleanProduct = sanitize(productSearchTerm);

                const matched = allPipes.filter((p: any) => {
                    const cleanName = sanitize(p.name);
                    return cleanName.includes(cleanSearch) ||
                        cleanName.includes(cleanProduct) ||
                        (cleanSearch.length > 3 && cleanName.includes(cleanSearch.substring(0, cleanSearch.length - 1)));
                });

                repoBasedPipes.push(...matched.map((p: any) => ({ ...p, type: 'Repo-Based', priority: 400 })));
                if (repoBasedPipes.length > 0 && verbose) {
                    console.log(`      ✅ Repo-Based Discovery: Found ${repoBasedPipes.length} pipelines matching "${searchTerm}"`);
                }
            } catch (e: any) {
                if (verbose) console.warn(`      ⚠️  Repo-based discovery failed: ${e.message}`);
            }

            // STRATEGY 2: SURGICAL DISCOVERY (Fallback, +300)
            const surgicalPipes: any[] = [];
            if (repoBasedPipes.length === 0) {
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
                                        surgicalPipes.push({ ...d.definition, type: 'Surgical (Live)', priority: 300 });
                                    }
                                }
                                if (surgicalPipes.length > 0) break;
                            }
                        }
                    } catch (e) { }
                }
                if (surgicalPipes.length > 0 && verbose) {
                    console.log(`      ✅ Surgical Discovery: Found ${surgicalPipes.length} live pipelines`);
                }
            }

            // STRATEGY 3: GENERAL DISCOVERY (Last Resort, +200 repo-specific, +0 project-wide)
            let generalPipes: any[] = [];
            if (repoBasedPipes.length === 0 && surgicalPipes.length === 0) {
                const [yamlPipes, buildDefs, releaseDefs, projPipes, projBuilds] = await Promise.all([
                    safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken), 'YAML Pipelines'),
                    safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken), 'Build Definitions'),
                    safeFetch(() => AzureService.fetchADOReleaseDefinitions(devops.organization, projectId, devops.pat, devops.baseUrl, bearerToken), 'Release Definitions'),
                    safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'Proj YAML'),
                    safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectId, '', devops.pat, devops.baseUrl, bearerToken), 'Proj Build')
                ]);

                generalPipes = [
                    ...yamlPipes.map(p => ({ ...p, type: 'YAML', priority: 200 })),
                    ...buildDefs.map(p => ({ ...p, type: 'Classic Build', priority: 200 })),
                    ...releaseDefs.map(r => ({ ...r, type: 'Classic Release', isRelease: true, priority: 200 })),
                    ...projPipes.map(p => ({ ...p, type: 'YAML (Proj)', priority: 0 })),
                    ...projBuilds.map(p => ({ ...p, type: 'Classic Build (Proj)', priority: 0 }))
                ];
            }

            const combinedPipelines = [
                ...repoBasedPipes,
                ...surgicalPipes,
                ...generalPipes
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
                let score = p.priority || 0; // Start with priority bonus
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

            // --- STEP 4: EFFICIENT BUILD-BASED HASH SYNC (Replaces Surgical Environment Discovery) ---
            const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectId;
            if (pipelineProject !== projectId) {
                console.log(`      ℹ️  Pipeline belongs to a different project: ${pipelineProject}. Switching context for Step 4.`);
            }

            console.log(`   ⏳ Fetching latest successful build for ${matchedPipeline.name} (ID: ${matchedPipeline.id}) in project ${pipelineProject}...`);

            let latestBuild: any = null;

            // Handle Classic Release Pipelines differently
            if ((matchedPipeline as any).isRelease) {
                console.log(`      ℹ️  Classic Release Pipeline detected. Fetching latest release...`);
                const releases = await AzureService.fetchADOReleases(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
                const successfulRelease = releases.find(r => r.environments?.some(e => e.status?.toLowerCase() === 'succeeded'));
                if (successfulRelease) {
                    latestBuild = {
                        id: successfulRelease.id,
                        sourceVersion: successfulRelease.artifacts?.[0]?.definitionReference?.version?.id,
                        sourceBranch: successfulRelease.artifacts?.[0]?.definitionReference?.branch?.name || 'unknown',
                        requestedFor: successfulRelease.createdBy,
                        finishTime: successfulRelease.modifiedOn,
                        _links: successfulRelease._links,
                        project: successfulRelease.project || (matchedPipeline as any).project
                    };
                }
            } else {
                // Use the new efficient Builds API for YAML and Classic Build pipelines
                latestBuild = await AzureService.fetchLatestSuccessfulBuild(
                    devops.organization,
                    pipelineProject,
                    matchedPipeline.id,
                    devops.pat,
                    devops.baseUrl,
                    bearerToken
                );
            }

            if (!latestBuild) {
                console.warn(`      ⚠️  No successful build found for pipeline ${matchedPipeline.id}. Skipping environment sync.`);
            } else {
                console.log(`      ✅ Latest build found (ID: ${latestBuild.id}, Finished: ${latestBuild.finishTime})`);

                // --- EXTRACT COMMIT HASH with Multi-Repo Resolution ---
                let commitHash = latestBuild.sourceVersion || latestBuild.sourceVersionID;

                // Multi-Repo Resolution: Check if build's primary repo matches our target repo
                if (latestBuild.repository?.name && meta.repository?.name &&
                    latestBuild.repository.name.toLowerCase() !== meta.repository.name.toLowerCase()) {

                    if (verbose) console.log(`      ⚠️  Build primary repo (${latestBuild.repository.name}) != target (${meta.repository.name}). Scanning resources...`);

                    if (latestBuild.resources?.repositories) {
                        const targetRepoRes = Object.values(latestBuild.resources.repositories).find((r: any) =>
                            r.repository?.name?.toLowerCase() === meta.repository!.name.toLowerCase() ||
                            r.repository?.id === meta.repository!.id
                        );
                        if ((targetRepoRes as any)?.version) {
                            commitHash = (targetRepoRes as any).version;
                            if (verbose) console.log(`      🎯 [Multi-Repo] Using commit from target repository (${meta.repository.name}): ${commitHash}`);
                        }
                    }
                }

                if (!commitHash || commitHash === 'unknown') {
                    console.warn(`      ⚠️  Build found but commit hash is missing. Cannot sync environments.`);
                } else {
                    // --- APPLY SAME COMMIT TO ALL ENVIRONMENTS ---
                    const author = latestBuild.requestedFor?.displayName || latestBuild.requestedBy?.displayName || 'Unknown';
                    const rawBranch = latestBuild.sourceBranch || 'unknown';
                    const branch = rawBranch.replace('refs/heads/', '');
                    const message = latestBuild.triggerInfo?.['ci.message'] || latestBuild.sourceVersionMessage || 'No message';
                    const buildUrl = latestBuild._links?.web?.href || latestBuild.url;

                    console.log(`      📦 Applying commit ${commitHash.substring(0, 7)} to ${envsToSync.length} environment(s)...`);

                    for (const envName of envsToSync) {
                        meta.deployments[envName] = {
                            hash: commitHash,
                            date: latestBuild.finishTime || new Date().toISOString(),
                            branch,
                            author,
                            message,
                            url: buildUrl
                        };
                        console.log(`      ✅ ${envName.padEnd(5)}: Applied ${commitHash.substring(0, 7)} (Author: ${author})`);
                    }
                }
            }

            // 2. Scan Fallback (if envs missing)
            const missingEnvs = envsToSync.filter(e => !meta.deployments[e]);
            if (missingEnvs.length > 0) {
                console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to paginated timeline scan (PipeProject: ${pipelineProject}, Depth: 100)...`);
                const timelineCache = new Map<number, any[]>();
                let skip = 0;
                const pageSize = 20;
                const maxDepth = 100;

                while (Object.keys(meta.deployments).length < envsToSync.length && skip < maxDepth) {
                    const builds = await AzureService.fetchBuildsByDefinition(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
                    console.log(`   📡 [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds...`);

                    if (builds.length === 0) break;

                    for (const run of builds) {
                        if (Object.keys(meta.deployments).length === envsToSync.length) break;
                        const buildProject = run.project?.id || run.project?.name || pipelineProject;
                        if (!timelineCache.has(run.id)) {
                            timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, buildProject, run.id, devops.pat, devops.baseUrl, bearerToken));
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

    // --- OUTPUT & REPORTING (moved inside main()) ---
    const dataDir = existsSync(join(process.cwd(), 'scripts', 'data'))
        ? join(process.cwd(), 'scripts', 'data')
        : join(process.cwd(), 'apim-database', 'scripts', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    // --- DIAGNOSTIC: UNMAPPED REPOSITORIES ---
    console.log(`\n🔍 Scanning for unmapped repositories in organization "${devops.organization}"...`);
    const usedRepoNames = new Set(results.filter(r => r.repository).map(r => r.repository!.name));
    const unmappedRepos: { name: string; project: string; url: string }[] = [];

    try {
        // Get all projects in the organization
        const projectsUrl = `${devops.baseUrl}/${devops.organization}/_apis/projects?api-version=7.1`;
        const authHeader = AzureService.getAuthHeader(devops.pat, bearerToken);
        const projResp = await fetch(projectsUrl, { headers: { 'Authorization': authHeader } });

        if (projResp.ok) {
            const projData = await projResp.json();
            const projects = projData.value || [];

            console.log(`   📦 Found ${projects.length} projects. Scanning repositories...`);

            for (const proj of projects) {
                try {
                    const reposUrl = `${devops.baseUrl}/${devops.organization}/${proj.id}/_apis/git/repositories?api-version=7.1`;
                    const reposResp = await fetch(reposUrl, { headers: { 'Authorization': authHeader } });

                    if (reposResp.ok) {
                        const reposData = await reposResp.json();
                        const repos = reposData.value || [];

                        for (const repo of repos) {
                            if (!usedRepoNames.has(repo.name)) {
                                unmappedRepos.push({
                                    name: repo.name,
                                    project: proj.name,
                                    url: repo.webUrl || repo.url
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`      ⚠️  Failed to fetch repos for project ${proj.name}`);
                }
            }
        }
    } catch (e: any) {
        console.warn(`   ⚠️  Failed to fetch unmapped repositories: ${e.message}`);
    }

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

    // --- GENERATE CSV EXPORTS ---
    console.log(`\n📊 Generating CSV reports...`);

    // Helper function to convert array of objects to CSV
    const arrayToCSV = (data: any[]): string => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const escapeCsvValue = (val: any): string => {
            const str = String(val ?? '');
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(h => escapeCsvValue(row[h])).join(','))
        ];
        return csvRows.join('\n');
    };

    // CSV 1: Deployments Summary (one row per product-environment combination)
    const deploymentRows: any[] = [];
    results.forEach(r => {
        if (r.status === 'MATCHED' && Object.keys(r.deployments).length > 0) {
            Object.entries(r.deployments).forEach(([env, deployment]) => {
                deploymentRows.push({
                    'Product Name': r.productName,
                    'Product ID': r.productId,
                    'Environment': env,
                    'Commit Hash': deployment.hash,
                    'Short Hash': deployment.hash?.substring(0, 7) || 'N/A',
                    'Author': deployment.author || 'Unknown',
                    'Branch': deployment.branch || 'unknown',
                    'Date': deployment.date,
                    'Commit Message': deployment.message || 'No message',
                    'Repository': r.repository?.name || 'N/A',
                    'Pipeline': r.pipeline?.name || 'N/A',
                    'Pipeline ID': r.pipeline?.id || 'N/A',
                    'Build URL': deployment.url || 'N/A',
                    'Status': r.status
                });
            });
        }
    });

    // CSV 2: Products Overview (one row per product)
    const productRows: any[] = [];
    results.forEach(r => {
        const envCount = Object.keys(r.deployments).length;
        const envList = Object.keys(r.deployments).join(', ') || 'None';
        productRows.push({
            'Product Name': r.productName,
            'Product ID': r.productId,
            'Status': r.status,
            'Repository': r.repository?.name || 'N/A',
            'Repository ID': r.repository?.id || 'N/A',
            'Project': r.repository?.project || 'N/A',
            'Pipeline': r.pipeline?.name || 'N/A',
            'Pipeline ID': r.pipeline?.id || 'N/A',
            'Environments Found': envCount,
            'Environment List': envList
        });
    });

    // CSV 3: Missing/Issues Report
    const issueRows: any[] = [
        ...missingStats.repoMissing.map(name => ({ 'Product': name, 'Issue': 'Repository Missing', 'Severity': 'High' })),
        ...missingStats.pipelineMissing.map(name => ({ 'Product': name, 'Issue': 'Pipeline Missing', 'Severity': 'High' })),
        ...missingStats.noDeployments.map(name => ({ 'Product': name, 'Issue': 'No Deployments Found', 'Severity': 'Medium' }))
    ];

    // Write CSV files
    const deploymentsCSV = join(dataDir, 'ado-deployments.csv');
    const productsCSV = join(dataDir, 'ado-products.csv');
    const issuesCSV = join(dataDir, 'ado-issues.csv');

    writeFileSync(deploymentsCSV, arrayToCSV(deploymentRows));
    writeFileSync(productsCSV, arrayToCSV(productRows));
    writeFileSync(issuesCSV, arrayToCSV(issueRows.length > 0 ? issueRows : [{ 'Product': 'N/A', 'Issue': 'No issues found!', 'Severity': 'N/A' }]));

    console.log(`   ✅ Deployments CSV: ${deploymentsCSV} (${deploymentRows.length} rows)`);
    console.log(`   ✅ Products CSV: ${productsCSV} (${productRows.length} rows)`);
    console.log(`   ✅ Issues CSV: ${issuesCSV} (${issueRows.length} rows)`);

    console.log(`\n✅ ADO Metadata Extraction Complete! Saved to: ${outputPath}`);
    console.log(`\n📋 Missing Report Generated:`);
    if (missingStats.repoMissing.length > 0) console.log(`   ❌ Repo Missing: ${missingStats.repoMissing.length}`);
    if (missingStats.pipelineMissing.length > 0) console.log(`   ❌ Pipeline Missing: ${missingStats.pipelineMissing.length}`);
    if (missingStats.noDeployments.length > 0) console.log(`   ❌ No Deployments Found: ${missingStats.noDeployments.length}`);
    console.log(`   📄 Saved to: ${reportPath}`);

    // --- DIAGNOSTIC REPORTS ---
    console.log(`\n🔬 DIAGNOSTIC REPORTS:`);

    if (repoLessProducts.length > 0) {
        console.log(`\n   ⚠️  REPO-LESS PRODUCTS (${repoLessProducts.length}):`);
        repoLessProducts.slice(0, 10).forEach(p => {
            console.log(`      - \"${p.name}\" (searched: ${p.searchTerm})`);
        });
        if (repoLessProducts.length > 10) {
            console.log(`      ... and ${repoLessProducts.length - 10} more`);
        }
        const repoLessPath = join(dataDir, 'ado-repoless-products.json');
        writeFileSync(repoLessPath, JSON.stringify(repoLessProducts, null, 2));
        console.log(`      📄 Full list: ${repoLessPath}`);
    } else {
        console.log(`   ✅ No repo-less products found!`);
    }

    if (unmappedRepos.length > 0) {
        console.log(`\n   📦 UNMAPPED REPOSITORIES in org \"${devops.organization}\" (${unmappedRepos.length}):`);
        unmappedRepos.slice(0, 10).forEach(r => {
            console.log(`      - \"${r.name}\" (Project: ${r.project})`);
        });
        if (unmappedRepos.length > 10) {
            console.log(`      ... and ${unmappedRepos.length - 10} more`);
        }
        const unmappedPath = join(dataDir, 'ado-unmapped-repos.json');
        writeFileSync(unmappedPath, JSON.stringify(unmappedRepos, null, 2));
        console.log(`      📄 Full list: ${unmappedPath}`);
    } else {
        console.log(`   ✅ All repositories are mapped to products!`);
    }
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
