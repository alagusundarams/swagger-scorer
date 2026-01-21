/**
 * @fileoverview DEBUG: HYBRID SURGICAL HASH DISCOVERY
 * 
 * 🛡️ SAFE_MODE: This is a read-only diagnostic tool. It will NOT mutate the database.
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
        console.log(`   📦 Search Response: ${searchRes.count} results`);
        if (searchRes.count > 0) {
            console.log(`   📦 Full Response:`, JSON.stringify(searchRes, null, 2));
        }
        finalRepo = searchRes.results?.[0]?.repository;
        if (!finalRepo) {
            const fallbackQuery = `${repoOverride}`;
            console.log(`   🔍 Fallback Search Query: "${fallbackQuery}"`);
            const repos = await AzureService.searchCode(devops.organization, fallbackQuery, devops.pat, devops.baseUrl, bearerToken);
            console.log(`   📦 Fallback Response: ${repos.count} results`);
            if (repos.count > 0) {
                console.log(`   📦 Full Fallback Response:`, JSON.stringify(repos, null, 2));
            }
            finalRepo = repos.results?.find((r: any) => sanitize(r.repository.name) === sanitize(repoOverride))?.repository;
        }
        if (!finalRepo) {
            console.error(`   ❌ FATAL: Repository override "${repoOverride}" not found. Cannot proceed.`);
            return;
        }
    } else {
        // Search specifically in terraform files for the product name
        const tfSearchQuery = `${productNameArg} ext:tf`;
        console.log(`   📡 Primary Search: Looking for product in Terraform files...`);
        console.log(`   🔍 Search Query: "${tfSearchQuery}"`);

        const res = await AzureService.searchCode(devops.organization, tfSearchQuery, devops.pat, devops.baseUrl, bearerToken);
        console.log(`   📦 Search Response: ${res.count} results found`);
        if (res.count > 0) {
            console.log(`   📦 Full Search Response:`, JSON.stringify(res, null, 2));
        }

        // If nothing found in .tf files, try without extension filter
        if (res.count === 0) {
            const broadQuery = productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg!;
            console.log(`   ⚠️  No results in .tf files. Trying broader search...`);
            console.log(`   🔍 Broad Search Query: "${broadQuery}"`);
            const broadRes = await AzureService.searchCode(devops.organization, broadQuery, devops.pat, devops.baseUrl, bearerToken);
            console.log(`   📦 Broad Search Response: ${broadRes.count} results found`);
            if (broadRes.count > 0) {
                console.log(`   📦 Full Broad Response:`, JSON.stringify(broadRes, null, 2));
                res.results = broadRes.results;
                res.count = broadRes.count;
            }
        }

        if (!res.results || res.results.length === 0) {
            console.error(`   ❌ FATAL: No repository found containing product "${productNameArg}".`);
            console.error(`   💡 Searched in: Terraform files (.tf) and code content`);
            console.error(`   💡 This product may not exist in Azure DevOps or may use a different name.`);
            console.error(`   💡 Stopping here - please verify product name and try again.`);
            return;
        }

        console.log(`   ✅ Found ${res.count} file(s) containing product name`);

        // Extract unique repositories from results
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
        console.log(`   📊 Found ${candidates.length} unique repository/repositories:`);
        candidates.forEach((c: any, idx: number) => {
            console.log(`      ${idx + 1}. ${c.name} (found in: ${c.path || c.fileName})`);
        });

        if (candidates.length === 0) {
            console.error(`   ❌ FATAL: Search returned results but no valid repositories extracted.`);
            return;
        }

        // If multiple repos found, pick the first one (most relevant)
        if (candidates.length > 1) {
            console.log(`   ⚠️  Multiple repositories contain this product. Selecting first match: ${candidates[0].name}`);
            console.log(`   💡 If this is incorrect, use --repo="${candidates[0].name}" to specify a different one.`);
        }

        finalRepo = candidates[0].repo;
        console.log(`   🎯 Selected Repository: ${finalRepo.name}`);
    }

    if (!finalRepo) return;

    // --- MANDATORY METADATA RECOVERY ---
    let project = "Unknown";
    let projectIdent = "Unknown";
    const primaryRepoName = finalRepo.name;
    const primaryRepoId = finalRepo.id;

    try {
        console.log(`\n🔎 Authorizing Repository Metadata: ${primaryRepoName}...`);
        console.log(`   📡 [ADO Request] GET ${devops.baseUrl}/${devops.organization}/_apis/git/repositories/${primaryRepoId || primaryRepoName}`);
        const details = await AzureService.fetchRepoById(devops.organization, primaryRepoId || primaryRepoName, devops.pat, devops.baseUrl, bearerToken);
        console.log(`   📦 [ADO Response]:`, JSON.stringify(details, null, 2));
        project = details.project.name;
        projectIdent = details.project.id;
        (finalRepo as any).webUrl = details.webUrl;
        console.log(`   ✅ Authorized: Project="${project}"`);
        console.log(`   📇 Project ID: ${projectIdent}`);
    } catch (e: any) {
        console.warn(`   ⚠️  Failed to recover project metadata: ${e.message}`);
        project = finalRepo.project?.name || project;
        projectIdent = finalRepo.project?.id || project;
    }

    const projectIdentifier = projectIdent || project;
    const isGuid = /^[0-9a-f-]{36}$/i.test(projectIdentifier);
    if (!isGuid && projectIdentifier !== 'Unknown') {
        console.warn(`   ⚠️  Project Identifier is NOT a GUID (${projectIdentifier}). This may cause API failures on some endpoints.`);
        console.warn(`   💡 Tip: Ensure the project name '${project}' exactly matches the ADO UI or use the GUID if known.`);
    }

    const repoWebUrl = (finalRepo as any).webUrl || `${devops.baseUrl}/${devops.organization}/${project}/_git/${primaryRepoName}`;
    console.log(`   🔗 Repo URL: ${repoWebUrl}`);

    // --- STEP 2: PIPELINE DISCOVERY ---
    console.log(`\n➡️  Step 2: Pipeline Discovery (Repository-Filtered)...`);
    console.log(`   🎯 Target Repository: ${primaryRepoName} (ID: ${primaryRepoId})`);

    try {
        await AzureService.verifyAdoConnection(devops.organization, devops.pat, devops.baseUrl, bearerToken);
    } catch (err: any) {
        console.error(`❌ [AUTH] PAT/Token Verification failed: ${err.message}`);
        process.exit(1);
    }

    const runDiscovery = async () => {
        console.log(`   ⏳ Step 2.1: ID-Based Surgical Search (repositoryId=${primaryRepoId})...`);

        // 1. Try ID-based surgical strike
        let buildDefs = await AzureService.fetchADOBuildDefinitions(
            devops.organization,
            projectIdentifier,
            primaryRepoId,
            devops.pat,
            devops.baseUrl,
            bearerToken
        );

        if (buildDefs.length === 0) {
            console.log(`   ⚠️  ID-based search returned 0 results. Trying Step 2.2: Name-Based Surgical Search...`);
            console.log(`   ⏳ Step 2.2: Name-Based Surgical Search (name=${primaryRepoName})...`);

            // 2. Try Name-based surgical strike (fallback)
            buildDefs = await AzureService.fetchADOBuildDefinitions(
                devops.organization,
                projectIdentifier,
                undefined, // repoId
                devops.pat,
                devops.baseUrl,
                bearerToken,
                primaryRepoName // repoName
            );
        }

        console.log(`   📊 Result: Found ${buildDefs.length} build definition(s)`);

        if (buildDefs.length === 0) {
            console.log(`   ❌ No build definitions found for this repository using surgical methods.`);
        }

        return buildDefs.map(p => ({ ...p, type: 'Build Definition', repositoryId: primaryRepoId }));
    };

    const runSurgicalDiscovery = async (): Promise<any[]> => {
        console.log(`   ⏳ Attempting Surgical Pipeline Discovery (Repo-Filtered Patterns)...`);
        const foundPipes = new Map<number, any>();

        // First, get all pipelines for this specific repository
        const repoPipelines = await runDiscovery();

        if (repoPipelines.length === 0) {
            console.log(`      ⚠️  No pipelines found for repository ${primaryRepoName}`);
            return [];
        }

        console.log(`      📊 Found ${repoPipelines.length} pipelines for this repository`);

        // Common pipeline naming patterns based on repository structure
        const repoBaseName = finalRepo.name.replace(/[-_]/g, ' ').split(' ').filter((w: string) => w.length > 0).join('-');
        const candidatePatterns = [
            finalRepo.name,                           // Exact repo name
            `${finalRepo.name}-CI`,                   // Repo-CI
            `${finalRepo.name}-CD`,                   // Repo-CD
            `${repoBaseName}-Pipeline`,               // Repo-Pipeline
            `CI-${finalRepo.name}`,                   // CI-Repo
            `Deploy-${finalRepo.name}`,               // Deploy-Repo
        ];

        console.log(`      🔎 Testing ${candidatePatterns.length} naming patterns against ${repoPipelines.length} repo pipelines...`);

        // Try to find pipelines using common naming patterns
        for (const pattern of candidatePatterns) {
            const matches = repoPipelines.filter((p: any) =>
                p.name && p.name.toLowerCase().includes(pattern.toLowerCase())
            );

            console.log(`      🔍 Pattern "${pattern}": ${matches.length} matches`);

            // Validate each match has recent successful builds
            for (const pipe of matches) {
                try {
                    const build = await AzureService.fetchLatestSuccessfulBuild(
                        devops.organization,
                        projectIdentifier,
                        pipe.id,
                        devops.pat,
                        devops.baseUrl,
                        bearerToken
                    );

                    if (build) {
                        console.log(`      ✅ [Surgical] Found active pipeline: ${pipe.name} (ID: ${pipe.id})`);
                        foundPipes.set(pipe.id, {
                            ...pipe,
                            type: 'Surgical (Pattern Match)',
                            _links: { web: { href: `${devops.baseUrl}/${devops.organization}/${projectIdentifier}/_build?definitionId=${pipe.id}` } }
                        });
                    }
                } catch (e) {
                    // Pipeline has no successful builds, skip
                }
            }

            if (foundPipes.size > 0) break; // Found active pipelines, stop searching
        }

        if (foundPipes.size === 0) {
            console.log(`      ℹ️  No pipelines matched naming patterns. Returning all ${repoPipelines.length} repo pipelines for scoring.`);
            return repoPipelines;
        }

        return Array.from(foundPipes.values());
    };

    let pipelines = await runSurgicalDiscovery();

    if (pipelines.length === 0) {
        console.error(`   ❌ FATAL: No pipelines found for repository "${primaryRepoName}".`);
        console.error(`   💡 This repository may not have any pipelines configured.`);
        console.error(`   💡 Please verify the repository has build/release pipelines in Azure DevOps.`);
        return;
    }

    console.log(`   ✅ Discovery complete: ${pipelines.length} pipeline(s) found for repository`);

    // --- STEP 3: PIPELINE MATCHING ---
    console.log(`\n➡️  Step 3: Matching Pipeline...`);
    const cleanProduct = sanitize(productNameArg!);

    const pipelineCandidates = pipelines.map(p => {
        const pName = p.name;
        const cleanPipe = sanitize(pName);
        const folder = sanitize(p.folder || '');
        let score = 0;
        if (cleanPipe === cleanProduct) score += 100;
        if (cleanPipe.includes(cleanProduct)) score += 50;
        if (folder.includes(cleanProduct)) score += 20;
        if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
        if (cleanPipe.includes('apim')) score += 5;
        if (cleanPipe === 'main' || cleanPipe === 'ci') score -= 20;

        return { pipe: p, score, name: pName, id: p.id, type: (p as any).type };
    }).sort((a, b) => b.score - a.score);

    console.log(`   🔎 Found ${pipelineCandidates.length} candidates. Top Picks:`);
    pipelineCandidates.slice(0, 10).forEach((c, i) => {
        console.log(`      ${(i + 1).toString().padStart(2)}. [${c.type.padEnd(15)}] ${c.name.padEnd(40)} (Score: ${c.score.toString().padStart(3)}, ID: ${c.id})`);
    });

    const matchedPipeline = pipelineCandidates[0].pipe;
    if (pipelineCandidates[0].score < 10) {
        console.log(`   ⚠️  LOW CONFIDENCE MATCH: ${matchedPipeline.name}.`);
    } else {
        console.log(`   ✅ Best Match: ${matchedPipeline.name} (ID: ${matchedPipeline.id}, Type: ${(matchedPipeline as any).type || 'Pipeline'})`);
        console.log(`      🔗 URL: ${matchedPipeline._links?.web?.href || 'N/A'}`);
    }

    // --- STEP 4: FETCH PER-ENVIRONMENT SUCCESSFUL BUILDS ---
    console.log(`\n➡️  Step 4: Fetch Per-Environment Successful Builds...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string; branch?: string; author?: string; message?: string; url?: string }> = {};

    const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectIdentifier;
    if (pipelineProject !== projectIdentifier) {
        console.log(`      ℹ️  Pipeline belongs to a different project: ${pipelineProject}. Switching context for Step 4.`);
    }

    console.log(`   ⏳ Scanning build history for environment-specific deployments in project ${pipelineProject}...`);

    // Deep scan for current regions
    const stageResults = await AzureService.fetchLatestStageResults(
        devops.organization,
        pipelineProject,
        matchedPipeline.id,
        envsToSync,
        devops.pat,
        devops.baseUrl,
        bearerToken
    );

    // Enrich each environment result with full build info (Author, Branch, Message, Multi-Repo)
    const buildDetailsCache = new Map<number, any>();

    for (const envName of envsToSync) {
        const result = stageResults[envName.toUpperCase()];
        if (!result || !result.buildId) continue;

        if (!buildDetailsCache.has(result.buildId)) {
            console.log(`      📡 Fetching full build details (ID: ${result.buildId}) from project ${pipelineProject}...`);
            const details = await AzureService.fetchADOBuild(devops.organization, pipelineProject, result.buildId, devops.pat, devops.baseUrl, bearerToken);
            buildDetailsCache.set(result.buildId, details);
        }

        const details = buildDetailsCache.get(result.buildId);
        if (details) {
            let commitHash = details.sourceVersion;

            // Multi-repo resolution
            const buildPrimaryRepo = details.repository?.name?.toLowerCase();
            const targetRepoName = finalRepo.name.toLowerCase();

            if (buildPrimaryRepo && buildPrimaryRepo !== targetRepoName) {
                console.log(`      ⚠️  [${envName}] Build primary repo (${buildPrimaryRepo}) != target (${targetRepoName}). Checking resources...`);
                if (details.resources?.repositories) {
                    const targetRes = Object.values(details.resources.repositories).find((r: any) =>
                        r.repository?.name?.toLowerCase() === targetRepoName ||
                        r.repository?.id === finalRepo.id
                    );
                    if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                }
            }

            if (commitHash && commitHash !== 'unknown') {
                deployments[envName] = {
                    hash: commitHash,
                    date: result.date || details.finishTime || details.queueTime || new Date().toISOString(),
                    branch: (details.sourceBranch || 'unknown').replace('refs/heads/', ''),
                    author: details.requestedFor?.displayName || details.requestedBy?.displayName || 'Unknown',
                    message: details.triggerInfo?.['ci.message'] || details.sourceVersionMessage || details.comment || 'No message',
                    url: details._links?.web?.href
                };
                console.log(`      🎯 ${envName.padEnd(5)}: Match! Build ${result.buildId} -> ${commitHash.substring(0, 7)}`);
            }
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
        pipelineUrl: matchedPipeline._links?.web?.href || 'N/A',
        deployments
    };
    console.log(JSON.stringify(finalOutput, null, 2));

    // --- WRITE JSON OUTPUT ---
    const jsonFileName = `debug-output-${sanitize(productNameArg!)}.json`;
    const jsonPath = join(process.cwd(), jsonFileName);
    writeFileSync(jsonPath, JSON.stringify(finalOutput, null, 2), 'utf8');
    console.log(`\n📄 JSON Output: ${jsonPath}`);

    // --- WRITE CSV OUTPUT ---
    const csvFileName = `debug-output-${sanitize(productNameArg!)}.csv`;
    const csvPath = join(process.cwd(), csvFileName);

    const csvHeaders = 'Environment,CommitHash,Branch,Author,Date,Message,BuildURL\n';
    const csvRows = Object.entries(deployments).map(([env, data]) => {
        const d = data as any;
        return `${env},${d.hash || 'N/A'},${d.branch || 'N/A'},"${(d.author || 'N/A').replace(/"/g, '""')}",${d.date || 'N/A'},"${(d.message || 'N/A').replace(/"/g, '""')}",${d.url || 'N/A'}`;
    }).join('\n');

    writeFileSync(csvPath, csvHeaders + csvRows, 'utf8');
    console.log(`📊 CSV Output: ${csvPath}`);
    console.log(`\n✅ Debug complete! Results saved to JSON and CSV files.`);
}

runDebug().catch(err => console.error(`\n💥 Fatal Error:`, err));
