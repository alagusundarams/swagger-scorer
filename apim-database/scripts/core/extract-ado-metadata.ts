/**
 * @fileoverview PART 2: ADO METADATA EXTRACTION
 * 
 * PURPOSE:
 * Consumes the product inventory from Part 1 and performs targeted ADO discovery.
 * Links products to Pipeline IDs and surgically recovers the latest successful hashes
 * for DEV, QA, STAGE, and PROD.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

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
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

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
    deployments: Record<string, { hash: string; date: string }>;
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

async function main() {
    console.log(`🚀 [PART 2] Starting ADO Metadata Extraction...\n`);
    if (targetEnv) console.log(`🎯 Filtering for Environment: ${targetEnv}\n`);

    const devops = config.devops;
    if (!devops) {
        console.error("❌ DevOps configuration missing in config.json");
        process.exit(1);
    }

    // 1. Load Inventory
    const inventoryPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'apim-inventory.json');
    if (!existsSync(inventoryPath)) {
        console.error(`❌ Inventory file not found: ${inventoryPath}. Run Part 1 first!`);
        process.exit(1);
    }
    let inventory: ProductIdentity[] = JSON.parse(readFileSync(inventoryPath, 'utf8'));

    // Filter by environment if flag is provided
    if (targetEnv) {
        inventory = inventory.filter((p: ProductIdentity) => p.environments.map(e => e.toUpperCase()).includes(targetEnv));
        console.log(`🎯 Filtered to ${inventory.length} products for ${targetEnv}.\n`);
    }

    if (limit > 0) {
        inventory = inventory.slice(0, limit);
        console.log(`⚠️  LIMIT MODE: Processing only ${limit} product(s) for testing.\n`);
    } else {
        console.log(`📊 Loaded ${inventory.length} unique products for discovery.`);
    }

    // 2. Setup Auth (PAT first, CLI as last resort)
    console.log(`🔐 [AUTH] Using PAT for ADO operations (Azure CLI will be tried as fallback if PAT fails)...`);

    // 3. Discovery Loop
    const results: ADOMetadata[] = [];
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const prod of inventory) {
        // --- SAFETY THROTTLE ---
        // Respects ADO/APIM rate limits by adding a 4s delay between products to avoid hitting search API limits.
        await sleep(4000);

        console.log(`\n🔹 Processing: ${prod.name} (${prod.id})`);
        const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };

        try {
            // A. Repository Search (Exhaustive & Ranked)
            const cleanProd = sanitize(prod.name);
            const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
            const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
            const searchResp = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl);

            if (!searchResp || searchResp.count === 0) {
                console.log(`   ⚠️  REPO_MISSING: No TF matches for "${prod.name}"`);
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            // DEBUG: Log what we actually got from ADO
            console.log(`   📊 DEBUG: Search returned ${searchResp.results.length} results`);
            if (searchResp.results.length > 0 && verbose) {
                console.log(`   📊 DEBUG: First result structure:`, JSON.stringify(searchResp.results[0], null, 2));
            }

            // --- RANKING LOGIC ---
            // More lenient filter: only require repository and repository.name
            const repoCandidates = searchResp.results
                .filter(r => r.repository && r.repository.name) // Only require name, not project
                .map(r => {
                    const rName = r.repository.name;
                    const cleanRepo = sanitize(rName);
                    let score = 0;

                    if (cleanRepo === cleanProd) score += 100; // Perfect match
                    else if (cleanRepo.includes(cleanProd)) score += 50; // Name included

                    if (cleanRepo.includes('grp')) score -= 20;
                    if (cleanRepo.includes('shared') || cleanRepo.includes('common')) score -= 30;

                    return { repo: r.repository, score, name: rName };
                }).sort((a, b) => b.score - a.score);

            if (repoCandidates.length === 0) {
                console.log(`   ⚠️  REPO_MISSING: All ${searchResp.results.length} search results had missing repository data for "${prod.name}"`);
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            const repo = repoCandidates[0].repo;
            const repoScore = repoCandidates[0].score;

            if (repoScore < 30) {
                console.log(`   ⚠️  LOW_CONFIDENCE_REPO: Nearest match "${repo.name}" has score ${repoScore}.`);
            }

            meta.repository = {
                id: repo.id,
                name: repo.name,
                project: repo.project?.name || 'Unknown',
                projectId: repo.project?.id || repo.project?.name || 'Unknown'
            };
            console.log(`   ✅ Repo: ${repo.name} (Score: ${repoScore})`);

            // B. Pipeline Discovery & Ranking
            const pipelines = await AzureService.fetchADOPipelines(devops.organization, repo.project.id || repo.project.name, repo.id, devops.pat, devops.baseUrl);

            if (pipelines.length === 0) {
                console.log(`   ⚠️  PIPELINE_MISSING: No pipelines in repo.`);
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            const pipeCandidates = pipelines.map(p => {
                const cleanPipe = sanitize(p.name);
                let score = 0;
                if (cleanPipe.includes(cleanProd)) score += 50;
                if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                if (cleanPipe.includes('apim')) score += 5;
                return { pipe: p, score, name: p.name };
            }).sort((a, b) => b.score - a.score);

            const matchedPipeline = pipeCandidates[0].pipe;
            const pipeScore = pipeCandidates[0].score;

            if (pipeScore < 10) {
                console.log(`   ⚠️  PIPELINE_MISSING: Only low-confidence matching pipelines found.`);
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            meta.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
            meta.status = 'MATCHED';
            console.log(`   ✅ Pipeline: ${matchedPipeline.name} (Score: ${pipeScore})`);

            // C. Surgical Hash Sync (Hybrid Strategy: Environments API + Adaptive Fallback)
            // If --env is specified, only sync that environment. Otherwise, sync all.
            const envsToSync = targetEnv ? [targetEnv] : ['DEV', 'QA', 'STAGE', 'PROD'];
            const projectIdent = repo.project.id || repo.project.name;
            const timelineCache = new Map<number, any[]>();

            // Phase 1: Surgical Strikes (Environments API) - Ultra Fast
            for (const envName of envsToSync) {
                const deploy = await AzureService.fetchLatestEnvironmentDeployment(
                    devops.organization, projectIdent, matchedPipeline.id, envName, devops.pat, devops.baseUrl
                );

                if (deploy) {
                    const commitHash = deploy.build?.sourceVersion || 'unknown';
                    meta.deployments[envName] = {
                        hash: commitHash,
                        date: deploy.finishTime || deploy.startTime
                    };
                    console.log(`      🎯 ${envName.padEnd(5)}: Surgical Hit! Captured ${commitHash.substring(0, 7)} (Deployment ${deploy.id})`);
                }
            }

            // Phase 2: Adaptive Fallback (Timeline Scanner) - For projects not using ADO Environments
            const missingEnvs = envsToSync.filter(e => !meta.deployments[e]);
            if (missingEnvs.length > 0) {
                let skip = 0;
                const pageSize = 20;
                const maxDepth = 100;

                while (Object.keys(meta.deployments).length < envsToSync.length && skip < maxDepth) {
                    const builds = await AzureService.fetchBuildsByDefinition(
                        devops.organization, projectIdent, matchedPipeline.id, devops.pat, devops.baseUrl, undefined, pageSize, skip
                    );

                    if (builds.length === 0) break;

                    for (const run of builds) {
                        if (Object.keys(meta.deployments).length === envsToSync.length) break;

                        if (!timelineCache.has(run.id)) {
                            timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdent, run.id, devops.pat, devops.baseUrl));
                        }

                        const timeline = timelineCache.get(run.id)!;
                        for (const envName of envsToSync) {
                            if (meta.deployments[envName]) continue;

                            const record = timeline.find((t: any) => {
                                const type = (t.type || '').toLowerCase();
                                const isContainer = ['stage', 'job', 'phase'].includes(type);
                                const nameMatches = sanitize(t.name).includes(sanitize(envName));
                                const isSuccess = t.result === 'succeeded' || t.result === 'partiallySucceeded';
                                return isContainer && nameMatches && isSuccess;
                            });

                            if (record) {
                                const commitHash = (run as any).sourceVersion || 'unknown';
                                meta.deployments[envName] = {
                                    hash: commitHash,
                                    date: record.finishTime || run.finishedDate
                                };
                                console.log(`      📍 ${envName.padEnd(5)}: Scanner Hit! Captured ${commitHash.substring(0, 7)} (Build ${run.id} via ${record.name})`);
                            }
                        }
                    }
                    skip += pageSize;
                }
            }

            results.push(meta);

        } catch (e: any) {
            console.error(`   ❌ Error: ${e.message}`);
            results.push(meta);
        }
    }

    // 4. Save Metadata
    const outputPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'ado-metadata.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\n✅ ADO Metadata Extraction Complete!`);
    console.log(`📊 Matched ${results.filter(r => r.status === 'MATCHED').length} / ${inventory.length} products.`);
    console.log(`💾 Saved to: ${outputPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
