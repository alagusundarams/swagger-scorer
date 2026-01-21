/**
 * @fileoverview DEBUG: HYBRID SURGICAL HASH DISCOVERY
 * 
 * 🛠️ SAFE_MODE: This is a read-only diagnostic tool. It will NOT mutate the database.
 * Use this to verify logic for a single product before running the full sync.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'DEV';
const repoOverride = args.find(a => a.startsWith('--repo='))?.split('=')[1];
const verbose = !args.includes('--quiet'); // Default to verbose unless --quiet is used

if (help || !productNameArg) {
    console.log(`
🕵️‍♀️ ADO Discovery Debugger
Usage: 
  npx tsx scripts/debug/debug-git-logic.ts --product="My Product Name" [options]

Options:
  --env=DEV|QA|STAGE|PROD   (Target environment for hash sync)
  --repo="repo-name"       (Force discovery to use this specific repository)
  --verbose                 (Show raw ranking details and full candidates)
    `);
    process.exit(0);
}

// --- CONFIG ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(process.cwd(), 'scripts', 'config.json');

    if (existsSync(localConfig)) return JSON.parse(readFileSync(localConfig, 'utf8'));
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));
    if (existsSync(relativeConfig)) return JSON.parse(readFileSync(relativeConfig, 'utf8'));

    console.error("❌ config.json not found.");
    process.exit(1);
}

const config = loadConfig();
const devops = config.devops;
if (!devops || !devops.pat) {
    console.error("❌ 'devops' section missing in config.json");
    process.exit(1);
}

const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function runDebug() {
    console.log(`\n🕵️‍♀️ DEBUG: Git/Pipeline Discovery Test`);
    console.log(`   Target Product: "${productNameArg}"`);
    console.log(`   Target Env:     ${envArg}`);
    if (repoOverride) console.log(`   🛠️  Repo Override: "${repoOverride}"`);

    // --- AUTH INITIALIZATION ---
    let bearerToken: string | undefined;
    try {
        console.log(`\n🔑 Authenticating...`);
        bearerToken = await AzureService.getAdoAccessToken();
        console.log(`   ✅ Acquired Azure CLI Bearer Token for ADO.`);
    } catch (e: any) {
        console.warn(`   ⚠️  Azure CLI login failed or 'az' not found. Falling back to PAT only. (${e.message})`);
    }

    const authHeader = AzureService.getAuthHeader(devops.pat, bearerToken);

    // --- STEP 1: REPOSITORY DISCOVERY ---
    console.log(`\n➡️  Step 1: Repository Discovery (Searching Terraform Files)...`);

    let finalRepo: any = null;
    const cleanProd = sanitize(productNameArg!);

    if (repoOverride) {
        console.log(`   ⚙️ Using override repository: "${repoOverride}"...`);
        const searchQuery = `repo:${repoOverride} ext:tf`;
        console.log(`   🔍 Search Query: "${searchQuery}"`);
        const searchRes = await AzureService.searchCode(devops.organization, searchQuery, devops.pat, devops.baseUrl, bearerToken);
        console.log(`   📡 Search Response: ${searchRes.count} results`);
        finalRepo = searchRes.results?.[0]?.repository;
        if (!finalRepo) {
            const fallbackQuery = `${repoOverride}`;
            console.log(`   🔍 Fallback Search Query: "${fallbackQuery}"`);
            const repos = await AzureService.searchCode(devops.organization, fallbackQuery, devops.pat, devops.baseUrl, bearerToken);
            console.log(`   📡 Fallback Response: ${repos.count} results`);
            finalRepo = repos.results?.find((r: any) => sanitize(r.repository.name) === sanitize(repoOverride))?.repository;
        }
        if (!finalRepo) {
            console.error(`   ❌ FATAL: Repository override "${repoOverride}" not found. Cannot proceed.`);
            return;
        }
    } else {
        const tfSearchQuery = `${productNameArg} ext:tf`;
        console.log(`   🔍 Primary Search: Looking for product in Terraform files...`);
        console.log(`   🔍 Search Query: "${tfSearchQuery}"`);

        const res = await AzureService.searchCode(devops.organization, tfSearchQuery, devops.pat, devops.baseUrl, bearerToken);
        console.log(`   📡 Search Response: ${res.count} results found`);

        if (res.count === 0) {
            const broadQuery = productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg!;
            console.log(`   ⚠️  No results in .tf files. Trying broader search...`);
            console.log(`   🔍 Broad Search Query: "${broadQuery}"`);
            const broadRes = await AzureService.searchCode(devops.organization, broadQuery, devops.pat, devops.baseUrl, bearerToken);
            console.log(`   📡 Broad Search Response: ${broadRes.count} results found`);
            if (broadRes.count > 0) {
                res.results = broadRes.results;
                res.count = broadRes.count;
            }
        }

        if (!res.results || res.results.length === 0) {
            console.error(`   ❌ FATAL: No repository found containing product "${productNameArg}".`);
            return;
        }

        const repoMap = new Map<string, any>();
        res.results.forEach((r: any) => {
            const repoId = r.repository?.id;
            if (repoId && !repoMap.has(repoId)) {
                repoMap.set(repoId, {
                    repo: r.repository,
                    name: r.repository?.name,
                    path: r.path || '',
                    fileName: r.fileName || ''
                });
            }
        });

        const candidates = Array.from(repoMap.values());
        if (candidates.length === 0) {
            console.error(`   ❌ FATAL: Search returned results but no valid repositories extracted.`);
            return;
        }

        if (candidates.length > 1) {
            console.log(`   ⚠️  Multiple repositories contain this product. Selecting first match: ${candidates[0].name}`);
        }

        finalRepo = candidates[0].repo;
        console.log(`   ✅ Selected Repository: ${finalRepo.name}`);
    }

    if (!finalRepo) return;

    let project = "Unknown";
    let projectIdent = "Unknown";
    const primaryRepoName = finalRepo.name;
    const primaryRepoId = finalRepo.id;

    try {
        console.log(`\n🔑 Authorizing Repository Metadata: ${primaryRepoName}...`);
        const details = await AzureService.fetchRepoById(devops.organization, primaryRepoId || primaryRepoName, devops.pat, devops.baseUrl, bearerToken);
        project = details.project.name;
        projectIdent = details.project.id;
        (finalRepo as any).webUrl = details.webUrl;
        console.log(`   ✅ Authorized: Project="${project}" (ID: ${projectIdent})`);
    } catch (e: any) {
        console.warn(`   ⚠️  Failed to recover project metadata: ${e.message}`);
        project = finalRepo.project?.name || project;
        projectIdent = finalRepo.project?.id || project;
    }

    const projectIdentifier = projectIdent || project;
    const repoWebUrl = (finalRepo as any).webUrl || `${devops.baseUrl}/${devops.organization}/${project}/_git/${primaryRepoName}`;

    // --- STEP 2: PIPELINE DISCOVERY ---
    console.log(`\n➡️  Step 2: Pipeline Discovery (Repository-Filtered)...`);

    const runDiscovery = async () => {
        let buildDefs = await AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl, bearerToken);
        if (buildDefs.length === 0) {
            buildDefs = await AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, undefined, devops.pat, devops.baseUrl, bearerToken, primaryRepoName);
        }
        return buildDefs.map(p => ({ ...p, type: 'Build Definition', repositoryId: primaryRepoId }));
    };

    const runSurgicalDiscovery = async (): Promise<any[]> => {
        const foundPipes = new Map<number, any>();
        const repoPipelines = await runDiscovery();

        if (repoPipelines.length === 0) return [];

        const repoBaseName = finalRepo.name.replace(/[-_]/g, ' ').split(' ').filter((w: string) => w.length > 0).join('-');
        const candidatePatterns = [finalRepo.name, `${finalRepo.name}-CI`, `${finalRepo.name}-CD`, `${repoBaseName}-Pipeline`];

        for (const pattern of candidatePatterns) {
            const matches = repoPipelines.filter((p: any) => p.name && p.name.toLowerCase().includes(pattern.toLowerCase()));
            for (const pipe of matches) {
                try {
                    const build = await AzureService.fetchLatestSuccessfulBuild(devops.organization, projectIdentifier, pipe.id, devops.pat, devops.baseUrl, bearerToken);
                    if (build) {
                        foundPipes.set(pipe.id, { ...pipe, type: 'Surgical (Pattern Match)', _links: { web: { href: `${devops.baseUrl}/${devops.organization}/${projectIdentifier}/_build?definitionId=${pipe.id}` } } });
                    }
                } catch (e) { }
            }
            if (foundPipes.size > 0) break;
        }

        return foundPipes.size > 0 ? Array.from(foundPipes.values()) : repoPipelines;
    };

    let pipelines = await runSurgicalDiscovery();
    if (pipelines.length === 0) {
        console.error(`   ❌ FATAL: No pipelines found for repository "${primaryRepoName}".`);
        return;
    }

    // --- STEP 3: PIPELINE MATCHING ---
    console.log(`\n➡️  Step 3: Matching Pipeline...`);
    const pipelineCandidates = pipelines.map(p => {
        const pName = p.name;
        const cleanPipe = sanitize(pName);
        const folder = sanitize(p.folder || '');
        let score = 0;
        if (cleanPipe === sanitize(productNameArg!)) score += 100;
        if (cleanPipe.includes(sanitize(productNameArg!))) score += 50;
        if (folder.includes(sanitize(productNameArg!))) score += 20;
        if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
        return { pipe: p, score, name: pName, id: p.id, type: (p as any).type };
    }).sort((a, b) => b.score - a.score);

    const matchedPipeline = pipelineCandidates[0].pipe;
    console.log(`   ✅ Best Match: ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);

    // --- STEP 4: RELIABLE DEPLOYMENT DISCOVERY (Build-History Scan) ---
    console.log(`\n⏳ Step 4: Discovering Latest Deployments via Build History Scan...`);

    // Choose environments based on args
    const envsToSync = envArg === 'ALL' ? ['DEV', 'QA', 'STAGE', 'PROD'] : [envArg];
    const deployments: Record<string, { hash: string; date: string; branch?: string; author?: string; message?: string; url?: string; hashes?: Record<string, string>; discoverySource?: string }> = {};
    const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectIdentifier;

    console.log(`   📂 Scanning Environments: ${envsToSync.join(', ')}`);
    console.log(`   🎯 Target Project Repository: ${finalRepo.name} (ID: ${primaryRepoId})`);

    // Fetch up to 100 builds in one go to categorize them
    const builds = await AzureService.fetchBuildsByDefinition(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, 100);
    console.log(`   📡 Fetched ${builds.length} recent builds for classification...`);

    const envMap: Record<string, any> = {};
    const remainingEnvs = new Set(envsToSync.map(e => e.toUpperCase()));

    for (const build of builds) {
        if (remainingEnvs.size === 0) break;

        const timeline = await AzureService.fetchPipelineRunTimeline(devops.organization, pipelineProject, build.id, devops.pat, devops.baseUrl, bearerToken);
        if (!timeline) continue;

        for (const envName of Array.from(remainingEnvs)) {
            const stage = timeline.find((r: any) => {
                const type = (r.recordType || r.type || '').toLowerCase();
                const name = (r.name || '').toLowerCase();
                const isSuccess = ['succeeded', 'partiallysucceeded'].includes((r.result || '').toLowerCase());
                const isCompleted = (r.status || '').toLowerCase() === 'completed';
                // Precision match for environment name in stage record
                return type === 'stage' && name.includes(envName.toLowerCase()) && isSuccess && isCompleted;
            });

            if (stage) {
                console.log(`      ✅ Found Stage Hit: ${envName} -> Build ${build.id} (${build.sourceVersion?.substring(0, 7)})`);

                // --- MULTI-REPO DISAMBIGUATION for this specific build ---
                let primaryHash = build.sourceVersion;
                const extraHashes: Record<string, string> = {};

                // Ensure we have full details for multi-repo resolution
                const details = await AzureService.fetchADOBuild(devops.organization, build.project?.id || pipelineProject, build.id, devops.pat, devops.baseUrl, bearerToken);
                if (details?.resources?.repositories) {
                    const matchedResources: [string, any][] = Object.entries(details.resources.repositories).filter(([alias, r]: [string, any]) => {
                        const rName = (r.repository?.name || '').toLowerCase();
                        const rId = r.repository?.id;
                        const targetProduct = sanitize(productNameArg!).toLowerCase();
                        const finalRepoName = finalRepo.name.toLowerCase();

                        return rId === primaryRepoId ||
                            rName === finalRepoName ||
                            rName.includes(targetProduct) ||
                            finalRepoName.includes(rName) ||
                            alias.toLowerCase().includes(targetProduct) ||
                            alias.toLowerCase().includes('source');
                    });

                    if (matchedResources.length > 0) {
                        const primaryRes = matchedResources.find(([alias]) =>
                            alias.toLowerCase().includes('source') || alias.toLowerCase() === 'self'
                        ) || matchedResources[0];

                        primaryHash = (primaryRes[1] as any).version;
                        matchedResources.forEach(([alias, r]: [string, any]) => {
                            extraHashes[alias] = (r as any).version;
                        });
                        console.log(`         📦 Components: ${Object.keys(extraHashes).join(', ')}`);
                    }
                }

                deployments[envName] = {
                    hash: primaryHash,
                    hashes: Object.keys(extraHashes).length > 0 ? extraHashes : undefined,
                    date: stage.finishTime || build.finishTime || new Date().toISOString(),
                    branch: (build.sourceBranch || 'unknown').replace('refs/heads/', ''),
                    author: build.requestedFor?.displayName || 'Unknown',
                    message: build.triggerInfo?.['ci.message'] || build.sourceVersionMessage || 'No message',
                    url: build._links?.web?.href,
                    discoverySource: 'Build-History Scan'
                };
                remainingEnvs.delete(envName);
            }
        }
    }

    // Report misses
    for (const envName of Array.from(remainingEnvs)) {
        console.log(`      ❌ No successful deployment found for ${envName} in the last ${builds.length} builds.`);
    }

    // --- FINAL OUTPUT ---
    console.log(`\n✅ Final Seed Data:`);
    const finalOutput = {
        product: productNameArg,
        repo: primaryRepoName,
        repoUrl: repoWebUrl,
        project,
        projectId: projectIdent,
        pipeline: matchedPipeline.name,
        pipelineId: matchedPipeline.id,
        deployments
    };
    console.log(JSON.stringify(finalOutput, null, 2));

    const jsonPath = join(process.cwd(), `debug-output-${sanitize(productNameArg!)}.json`);
    writeFileSync(jsonPath, JSON.stringify(finalOutput, null, 2), 'utf8');
    console.log(`\n📄 JSON Output: ${jsonPath}`);
    console.log(`\n✅ Debug complete!`);
}

runDebug().catch(err => console.error(`\n💥 Fatal Error:`, err));
