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
                // --- PHASE 1: REPOSITORY DISCOVERY (SURGICAL) ---
                const cleanProd = sanitize(prod.name);

                // Search specifically in terraform files for the product name
                const tfSearchQuery = `${prod.name} ext:tf`;
                if (verbose) console.log(`   📡 Primary Search: Looking for product in Terraform files...`);

                let res = await AzureService.searchCode(devops.organization, tfSearchQuery, devops.pat, devops.baseUrl, bearerToken);

                // If nothing found in .tf files, try without extension filter
                if (!res || res.count === 0) {
                    const broadQuery = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
                    if (verbose) console.log(`   ⚠️  No results in .tf files. Trying broader search...`);
                    const broadRes = await AzureService.searchCode(devops.organization, broadQuery, devops.pat, devops.baseUrl, bearerToken);
                    if (broadRes && broadRes.count > 0) {
                        res = broadRes;
                    }
                }

                if (!res || !res.results || res.results.length === 0) {
                    if (verbose) console.warn(`   ❌ [Repo] No repository found containing product "${prod.name}".`);
                    meta.status = 'REPO_MISSING';
                    results.push(meta);
                    return;
                }

                // Extract unique repositories and scoring
                const repoMap = new Map<string, any>();
                res.results.forEach((r: any) => {
                    const repoId = r.repository?.id;
                    if (repoId && !repoMap.has(repoId)) {
                        const cleanRepo = sanitize(r.repository.name);
                        let score = 0;
                        if (cleanRepo === cleanProd) score += 100;
                        else if (cleanRepo.includes(cleanProd)) score += 50;

                        repoMap.set(repoId, {
                            repo: r.repository,
                            score,
                            path: r.path || ''
                        });
                    }
                });

                const candidates = Array.from(repoMap.values()).sort((a, b) => b.score - a.score);
                const repo = candidates[0].repo;

                // --- MANDATORY METADATA RECOVERY ---
                let project = repo.project?.name || "Unknown";
                let projectId = repo.project?.id || "";

                if (project === "Unknown" || !projectId) {
                    const repoDetails = await AzureService.fetchRepoById(devops.organization, repo.id, devops.pat, devops.baseUrl, bearerToken);
                    project = repoDetails.project.name;
                    projectId = repoDetails.project.id;
                }

                meta.repository = { id: repo.id, name: repo.name, project, projectId };
                if (verbose) console.log(`   🎯 Selected Repository: ${repo.name} (Project: ${project})`);

                // --- PHASE 2: PIPELINE DISCOVERY (SURGICAL) ---
                const runDiscovery = async () => {
                    if (verbose) console.log(`   ⏳ Step 2.1: ID-Based Surgical Search...`);

                    // 1. Try ID-based surgical strike
                    let buildDefs = await AzureService.fetchADOBuildDefinitions(
                        devops.organization,
                        projectId,
                        repo.id,
                        devops.pat,
                        devops.baseUrl,
                        bearerToken
                    );

                    if (buildDefs.length === 0) {
                        if (verbose) console.log(`   ⚠️  ID-based search returned 0. Trying Step 2.2: Name-Based Surgical...`);

                        // 2. Try Name-based surgical strike (fallback)
                        buildDefs = await AzureService.fetchADOBuildDefinitions(
                            devops.organization,
                            projectId,
                            undefined, // repoId
                            devops.pat,
                            devops.baseUrl,
                            bearerToken,
                            repo.name // repoName
                        );
                    }

                    return buildDefs.map(p => ({ ...p, type: 'Build Definition', repositoryId: repo.id }));
                };

                const repoPipelines = await runDiscovery();

                if (repoPipelines.length === 0) {
                    if (verbose) console.warn(`   ❌ [Pipeline] No pipelines found for repository "${repo.name}".`);
                    meta.status = 'PIPELINE_MISSING';
                    results.push(meta);
                    return;
                }

                // Score candidates to find the best deployment pipeline
                const pipelineCandidates = repoPipelines.map((p: any) => {
                    const pName = p.name || '';
                    const cleanPipe = sanitize(pName);
                    const folder = sanitize(p.folder || '');
                    let score = 0;
                    if (cleanPipe === cleanProd) score += 100;
                    if (cleanPipe.includes(cleanProd)) score += 50;
                    if (folder.includes(cleanProd)) score += 20;
                    if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                    if (cleanPipe.includes('apim')) score += 5;
                    if (cleanPipe === 'main' || cleanPipe === 'ci') score -= 20;
                    return { pipe: p, score };
                }).sort((a, b) => b.score - a.score);

                if (pipelineCandidates[0].score < 10) {
                    if (verbose) console.warn(`   ⚠️ [Pipeline] Low confidence match for ${pipelineCandidates[0].pipe.name}.`);
                    meta.status = 'PIPELINE_MISSING';
                    results.push(meta);
                    return;
                }

                const matchedPipeline = pipelineCandidates[0].pipe;
                meta.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
                meta.status = 'MATCHED';

                if (verbose) console.log(`   ✅ Best Pipeline: ${matchedPipeline.name} (Type: ${matchedPipeline.type})`);

                const envsToSync = targetEnv ? [targetEnv] : prod.environments;

                // --- PHASE 3: DEPLOYMENT EXTRACTION (SURGICAL) ---
                const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectId;
                if (pipelineProject !== projectId) {
                    if (verbose) console.log(`      ℹ️  Pipeline project (${pipelineProject}) != Repo project (${projectId}). Switching context.`);
                }

                if (verbose) console.log(`   ⏳ Fetching latest successful build for Pipeline: ${matchedPipeline.name} (ID: ${matchedPipeline.id})...`);

                let latestBuild: any = null;

                if ((matchedPipeline as any).isRelease) {
                    const releases = await AzureService.fetchADOReleases(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
                    const successfulRelease = releases.find(r => r.environments?.some(e => ['succeeded', 'partiallysucceeded'].includes((e.status || '').toLowerCase())));
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
                    latestBuild = await AzureService.fetchLatestSuccessfulBuild(
                        devops.organization,
                        pipelineProject,
                        matchedPipeline.id,
                        devops.pat,
                        devops.baseUrl,
                        bearerToken
                    );
                }

                if (latestBuild) {
                    let commitHash = latestBuild.sourceVersion;

                    // --- MULTI-REPO RESOLUTION ---
                    const buildPrimaryRepo = latestBuild.repository?.name?.toLowerCase();
                    const targetRepoName = repo.name.toLowerCase();

                    if (buildPrimaryRepo && buildPrimaryRepo !== targetRepoName) {
                        if (verbose) console.log(`      ⚠️  Build primary repo (${buildPrimaryRepo}) != target (${targetRepoName}). Scanning resources...`);
                        if (latestBuild.resources?.repositories) {
                            const targetRes = Object.values(latestBuild.resources.repositories).find((r: any) =>
                                r.repository?.name?.toLowerCase() === targetRepoName ||
                                r.repository?.id === repo.id
                            );
                            if ((targetRes as any)?.version) {
                                commitHash = (targetRes as any).version;
                            }
                        }
                    }

                    if (commitHash && commitHash !== 'unknown') {
                        const author = latestBuild.requestedFor?.displayName ||
                            latestBuild.requestedBy?.displayName ||
                            latestBuild.lastChangedBy?.displayName || 'Unknown';

                        const branch = (latestBuild.sourceBranch || 'unknown').replace('refs/heads/', '');
                        const message = latestBuild.triggerInfo?.['ci.message'] ||
                            latestBuild.sourceVersionMessage ||
                            latestBuild.comment || 'No message';

                        const url = latestBuild._links?.web?.href;
                        const buildDate = latestBuild.finishTime || latestBuild.queueTime || new Date().toISOString();

                        if (verbose) console.log(`      🎯 All Envs: Using Build ${latestBuild.id} | Hash: ${commitHash.substring(0, 7)} | Auth: ${author}`);

                        // Apply to all required environments
                        for (const envName of envsToSync) {
                            meta.deployments[envName] = {
                                hash: commitHash,
                                date: buildDate,
                                branch,
                                author,
                                message,
                                url
                            };
                        }
                    }
                }

                // Fallback Scanner (Timeline Search) if results missing
                const missingEnvs = envsToSync.filter(e => !meta.deployments[e]);
                if (missingEnvs.length > 0) {
                    if (verbose) console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to timeline scan (Project: ${pipelineProject})...`);
                    const timelineCache = new Map<number, any[]>();
                    let skip = 0;
                    const pageSize = 20;

                    while (Object.keys(meta.deployments).length < envsToSync.length && skip < 100) {
                        const builds = await AzureService.fetchBuildsByDefinition(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
                        if (builds.length === 0) break;

                        for (const run of builds) {
                            if (Object.keys(meta.deployments).length === envsToSync.length) break;

                            const runProject = run.project?.id || run.project?.name || pipelineProject;
                            if (!timelineCache.has(run.id)) {
                                timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, runProject, run.id, devops.pat, devops.baseUrl, bearerToken));
                            }
                            const timeline = timelineCache.get(run.id)!;

                            for (const envName of envsToSync) {
                                if (meta.deployments[envName]) continue;

                                const record = timeline.find((t: any) => {
                                    const nameMatches = sanitize(t.name).includes(sanitize(envName));
                                    const isSuccess = ['succeeded', 'partiallysucceeded'].includes((t.result || '').toLowerCase());
                                    return nameMatches && isSuccess && (t.status || '').toLowerCase() === 'completed';
                                });

                                if (record) {
                                    let hash = run.sourceVersion || 'unknown';

                                    // Multi-repo fix for scan
                                    if (run.repository?.name?.toLowerCase() !== repo.name.toLowerCase()) {
                                        if (run.resources?.repositories) {
                                            const targetRes = Object.values(run.resources.repositories).find((r: any) =>
                                                r.repository?.name?.toLowerCase() === repo.name.toLowerCase()
                                            );
                                            if ((targetRes as any)?.version) hash = (targetRes as any).version;
                                        }
                                    }

                                    meta.deployments[envName] = {
                                        hash,
                                        date: record.finishTime || run.finishedDate || new Date().toISOString(),
                                        branch: (run.sourceBranch || 'unknown').replace('refs/heads/', ''),
                                        author: run.requestedFor?.displayName || 'Unknown',
                                        message: run.triggerInfo?.['ci.message'] || 'No message',
                                        url: run._links?.web?.href
                                    };
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
