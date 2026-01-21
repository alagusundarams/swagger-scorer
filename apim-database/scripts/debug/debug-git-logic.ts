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

    // --- STEP 4: HYBRID DEPLOYMENT EXTRACTION ---
    console.log(`\n➡️  Step 4: Fetch Latest Successful Deployments (Hybrid Mode)...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string; branch?: string; author?: string; message?: string; url?: string }> = {};
    const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectIdentifier;

    // 4.1: CAPTURE BASELINE HASH (Fastest & Guaranteed)
    console.log(`   ⏳ Step 4.1: Capturing Baseline Global Hash from Pipeline...`);
    let baselineHash: string | undefined;
    let baselineData: any | undefined;

    try {
        const latestBuild = await AzureService.fetchLatestSuccessfulBuild(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
        if (latestBuild) {
            let commitHash = latestBuild.sourceVersion;
            // Multi-repo resolution for baseline
            if (latestBuild.repository?.name?.toLowerCase() !== finalRepo.name.toLowerCase()) {
                const details = await AzureService.fetchADOBuild(devops.organization, latestBuild.project?.id || pipelineProject, latestBuild.id, devops.pat, devops.baseUrl, bearerToken);
                if (details?.resources?.repositories) {
                    const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === finalRepo.name.toLowerCase());
                    if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                }
            }
            if (commitHash && commitHash !== 'unknown') {
                baselineHash = commitHash;
                baselineData = {
                    hash: commitHash,
                    date: latestBuild.finishTime || latestBuild.queueTime || new Date().toISOString(),
                    branch: (latestBuild.sourceBranch || 'unknown').replace('refs/heads/', ''),
                    author: latestBuild.requestedFor?.displayName || 'Unknown',
                    message: latestBuild.triggerInfo?.['ci.message'] || latestBuild.sourceVersionMessage || 'No message',
                    url: latestBuild._links?.web?.href
                };
                console.log(`      ✅ Captured Baseline: ${commitHash.substring(0, 7)} (Build ID: ${latestBuild.id})`);
            }
        }
    } catch (e: any) {
        console.warn(`      ⚠️  Failed to capture baseline: ${e.message}`);
    }

    // 4.2: SURGICAL ENRICHMENT (Per Environment)
    console.log(`\n   ⏳ Step 4.2: Attempting Surgical Enrichment per Environment...`);
    for (const envName of envsToSync) {
        console.log(`\n   📍 Checking Environment: ${envName}...`);

        // Use baseline as a starting point
        if (baselineData) {
            deployments[envName] = { ...baselineData };
        }

        // Try to "Sharpen" the data with a specific Strike
        let deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, pipelineProject, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
        if (!deploy && pipelineProject !== projectIdentifier) {
            deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, projectIdentifier, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
        }

        if (deploy) {
            const build = deploy.build || deploy.owner;
            if (build) {
                let commitHash = build.sourceVersion;
                if (build.repository?.name?.toLowerCase() !== finalRepo.name.toLowerCase()) {
                    console.log(`      ⚠️  Multi-repo detected for ${envName}. Resolving version...`);
                    const details = await AzureService.fetchADOBuild(devops.organization, build.project?.id || pipelineProject, build.id, devops.pat, devops.baseUrl, bearerToken);
                    if (details?.resources?.repositories) {
                        const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === finalRepo.name.toLowerCase());
                        if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                    }
                }

                if (commitHash && commitHash !== 'unknown') {
                    deployments[envName] = {
                        hash: commitHash,
                        date: deploy.finishTime || build.finishTime || new Date().toISOString(),
                        branch: (build.sourceBranch || 'unknown').replace('refs/heads/', ''),
                        author: build.requestedFor?.displayName || 'Unknown',
                        message: build.triggerInfo?.['ci.message'] || 'No message',
                        url: build._links?.web?.href
                    };
                    console.log(`      🎯 ${envName.padEnd(5)}: Strike Hit! Precision match: ${commitHash.substring(0, 7)}`);
                    continue;
                }
            }
        }

        // 3. Fallback: Only Deep Scan if Baseline is missing
        if (!baselineData) {
            console.log(`      ⚠️  No surgical strike match and no baseline. Falling back to deep scan...`);
            const stageResults = await AzureService.fetchLatestStageResults(devops.organization, pipelineProject, matchedPipeline.id, [envName], devops.pat, devops.baseUrl, bearerToken);
            const result = stageResults[envName.toUpperCase()];
            if (result && result.buildId) {
                const details = await AzureService.fetchADOBuild(devops.organization, pipelineProject, result.buildId, devops.pat, devops.baseUrl, bearerToken);
                if (details) {
                    let commitHash = details.sourceVersion;
                    if (details.repository?.name?.toLowerCase() !== finalRepo.name.toLowerCase() && details.resources?.repositories) {
                        const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === finalRepo.name.toLowerCase());
                        if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                    }
                    deployments[envName] = {
                        hash: commitHash,
                        date: result.date || details.finishTime || new Date().toISOString(),
                        branch: (details.sourceBranch || 'unknown').replace('refs/heads/', ''),
                        author: details.requestedFor?.displayName || 'Unknown',
                        message: details.triggerInfo?.['ci.message'] || 'No message',
                        url: details._links?.web?.href
                    };
                    console.log(`      🎯 ${envName.padEnd(5)}: Scanner Hit! Precision match: ${commitHash.substring(0, 7)}`);
                }
            }
        } else {
            console.log(`      ✅ Regional info not found. Using baseline: ${baselineHash?.substring(0, 7)}`);
        }
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
