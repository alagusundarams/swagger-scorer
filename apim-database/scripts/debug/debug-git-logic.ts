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

    // --- STEP 4: FETCH LATEST SUCCESSFUL BUILD ---
    console.log(`\n➡️  Step 4: Fetch Latest Successful Build...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string; branch?: string; author?: string; message?: string; url?: string }> = {};
    const timelineCache = new Map<number, any[]>();

    const pipelineProject = (matchedPipeline as any).project?.id || (matchedPipeline as any).project?.name || projectIdentifier;
    if (pipelineProject !== projectIdentifier) {
        console.log(`      ℹ️  Pipeline belongs to a different project: ${pipelineProject}. Switching context for Step 4.`);
    }

    console.log(`   ⏳ Fetching latest successful build for Pipeline Definition ID: ${matchedPipeline.id} (${matchedPipeline.name}) in Project: ${pipelineProject}...`);
    const buildsApiUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(pipelineProject)}/_apis/build/builds?definitions=${matchedPipeline.id}&resultFilter=succeeded&statusFilter=completed&$top=1&queryOrder=finishTimeDescending`;
    console.log(`   📡 [ADO Request] GET ${buildsApiUrl}`);

    let latestBuild: any = null;

    if ((matchedPipeline as any).isRelease) {
        // Handle Classic Release Pipelines separately
        const releasesUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(pipelineProject)}/_apis/release/releases?definitionId=${matchedPipeline.id}`;
        console.log(`      📡 [ADO Request] [Classic Release] GET ${releasesUrl}`);
        const releases = await AzureService.fetchADOReleases(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
        console.log(`      📦 [ADO Response]:`, JSON.stringify(releases, null, 2));
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
        // Use the new efficient Builds API for YAML pipelines
        latestBuild = await AzureService.fetchLatestSuccessfulBuild(
            devops.organization,
            pipelineProject,
            matchedPipeline.id,
            devops.pat,
            devops.baseUrl,
            bearerToken
        );
        if (latestBuild) {
            console.log(`   📦 [ADO Response] Latest Build:`, JSON.stringify(latestBuild, null, 2));
        } else {
            console.log(`   📦 [ADO Response]: No build found (null)`);
        }
    }

    if (latestBuild) {
        let commitHash = latestBuild.sourceVersion;

        // --- MULTI-REPO RESOLUTION ---
        // If the build's primary repo doesn't match our target, search in resources
        const primaryRepoName = latestBuild.repository?.name?.toLowerCase();
        const targetRepoNameMatch = finalRepo.name.toLowerCase();
        const targetRepoId = finalRepo.id;

        if (primaryRepoName && primaryRepoName !== targetRepoNameMatch) {
            console.log(`      ⚠️  Build primary repo (${primaryRepoName}) != target (${targetRepoNameMatch}). Scanning resources...`);
            if (latestBuild.resources?.repositories) {
                const repoResources = Object.values(latestBuild.resources.repositories);
                const targetRes = repoResources.find((r: any) =>
                    r.repository?.name?.toLowerCase() === targetRepoNameMatch ||
                    r.repository?.id === targetRepoId
                );
                if ((targetRes as any)?.version) {
                    commitHash = (targetRes as any).version;
                    console.log(`      🎯 [Multi-Repo] Found version from target repository (${targetRepoNameMatch}): ${commitHash}`);
                }
            }
        }

        if (commitHash && commitHash !== 'unknown') {
            const author = latestBuild.requestedFor?.displayName ||
                latestBuild.requestedBy?.displayName ||
                latestBuild.lastChangedBy?.displayName || 'Unknown';

            const rawBranch = latestBuild.sourceBranch || 'unknown';
            const branch = rawBranch.replace('refs/heads/', '');

            const message = latestBuild.triggerInfo?.['ci.message'] ||
                latestBuild.sourceVersionMessage ||
                latestBuild.comment ||
                latestBuild.description || 'No message';

            const url = latestBuild._links?.web?.href;
            const buildDate = latestBuild.finishTime || latestBuild.queueTime || new Date().toISOString();

            console.log(`\n   🎯 Latest Successful Build Found!`);
            console.log(`      📦 Build ID: ${latestBuild.id}`);
            console.log(`      🔗 Commit: ${commitHash.substring(0, 7)}`);
            console.log(`      👤 Author: ${author}`);
            console.log(`      🌿 Branch: ${branch}`);
            console.log(`      📅 Date: ${buildDate}`);
            console.log(`      🔗 URL: ${url || 'N/A'}`);

            // Apply same commit hash to ALL environments (same deployment across regions)
            for (const envName of envsToSync) {
                deployments[envName] = {
                    hash: commitHash,
                    date: buildDate,
                    branch,
                    author,
                    message,
                    url
                };
            }
        } else {
            console.warn(`      ⚠️  Build found but could not extract commit hash.`);
        }
    } else {
        console.warn(`      ⚠️  No successful builds found for this pipeline.`);
    }

    const missingEnvs = envsToSync.filter(e => !deployments[e]);
    if (missingEnvs.length > 0) {
        console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to paginated timeline scan in project ${pipelineProject} (Depth: 100)...`);
        let skip = 0;
        const pageSize = 20;
        const maxDepth = 100;

        while (Object.keys(deployments).length < envsToSync.length && skip < maxDepth) {
            const scanUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(pipelineProject)}/_apis/build/builds?definitions=${matchedPipeline.id}&$top=${pageSize}&$skip=${skip}`;
            console.log(`   📡 [ADO Request] [Scan Page ${Math.floor(skip / pageSize) + 1}] GET ${scanUrl}`);
            const builds = await AzureService.fetchBuildsByDefinition(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
            console.log(`   📦 [ADO Response] [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds`);

            if (builds.length === 0 && skip === 0) {
                console.log(`   ⚠️ No builds found for definition in project ${pipelineProject}. Trying broader search...`);
                let broadBuilds = await AzureService.fetchADOBuilds(devops.organization, pipelineProject, (matchedPipeline as any).repositoryId || primaryRepoId, devops.pat, devops.baseUrl, bearerToken);
                if (broadBuilds.length === 0) {
                    broadBuilds = await AzureService.fetchADOBuilds(devops.organization, pipelineProject, '', devops.pat, devops.baseUrl, bearerToken);
                }
                if (broadBuilds.length > 0) builds.push(...broadBuilds.slice(0, 20));
            }
            if (builds.length === 0) break;

            for (const run of builds) {
                if (Object.keys(deployments).length === envsToSync.length) break;

                // Determine build project for timeline fetch
                const runProject = run.project?.id || run.project?.name || pipelineProject;

                if (!timelineCache.has(run.id)) {
                    const timelineUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(runProject)}/_apis/build/builds/${run.id}/timeline`;
                    console.log(`      📡 [ADO Request] [Timeline] GET ${timelineUrl}`);
                    const timeline = await AzureService.fetchPipelineRunTimeline(devops.organization, runProject, run.id, devops.pat, devops.baseUrl, bearerToken);
                    console.log(`      📦 [ADO Response] [Timeline] Build ${run.id}: ${timeline.length} records`);
                    timelineCache.set(run.id, timeline);
                }
                const timeline = timelineCache.get(run.id)!;
                if (!timeline || timeline.length === 0) continue;

                for (const envName of envsToSync) {
                    if (deployments[envName]) continue;

                    let record = timeline.find((t: any) => {
                        const type = (t.type || '').toLowerCase();
                        const isContainer = ['stage', 'job', 'phase'].includes(type);
                        const nameMatches = sanitize(t.name).includes(sanitize(envName));
                        const isSuccess = ['succeeded', 'partiallysucceeded'].includes((t.result || '').toLowerCase());
                        return isContainer && nameMatches && isSuccess && (t.status || '').toLowerCase() === 'completed';
                    });

                    if (!record) {
                        record = timeline.find((t: any) => {
                            const nameMatches = sanitize(t.name).includes(sanitize(envName));
                            const isSuccess = ['succeeded', 'partiallysucceeded'].includes((t.result || '').toLowerCase());
                            return nameMatches && isSuccess && (t.status || '').toLowerCase() === 'completed';
                        });
                        if (record) console.log(`      💡 [Scan] Found non-container match for '${envName}' (${record.type}) in Build ${run.id}`);
                    }

                    if (record) {
                        let hash = run.sourceVersion || 'unknown';

                        // --- MULTI-REPO SCANNER FIX ---
                        if (run.repository?.name?.toLowerCase() !== finalRepo.name.toLowerCase()) {
                            console.log(`      ⚠️  Build ${run.id} primary repo (${run.repository?.name}) != target (${finalRepo.name}). Checking resources...`);
                            // Since we don't have full details in the build list usually, we might need a fetchADOBuild here or rely on run.resources
                            // but usually run list doesn't have it. Let's try to find it if possible.
                            if (run.resources?.repositories) {
                                const targetRes = Object.values(run.resources.repositories).find((r: any) =>
                                    r.repository?.name?.toLowerCase() === finalRepo.name.toLowerCase() ||
                                    r.repository?.id === finalRepo.id
                                );
                                if ((targetRes as any)?.version) {
                                    hash = (targetRes as any).version;
                                    console.log(`      🎯 [Multi-Repo Scan] Found version in run resources: ${hash}`);
                                }
                            }
                        }

                        const author = run.requestedFor?.displayName || run.requestedBy?.displayName || 'Unknown';
                        const branch = (run.sourceBranch || 'unknown').replace('refs/heads/', '');
                        const message = run.triggerInfo?.['ci.message'] || run.comment || 'No message';

                        deployments[envName] = {
                            hash,
                            date: record.finishTime || run.finishedDate || new Date().toISOString(),
                            branch,
                            author,
                            message,
                            url: run._links?.web?.href
                        };
                        console.log(`      📍 ${envName.padEnd(5)}: Scanner Hit! Captured ${hash.substring(0, 7)}`);
                        console.log(`         👤 Author: ${author}`);
                        console.log(`         🌿 Branch: ${branch}`);
                    }
                }
            }
            skip += pageSize;
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
