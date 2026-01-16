/**
 * @fileoverview DEBUG: HYBRID SURGICAL HASH DISCOVERY
 * 
 * 🛡️ SAFE_MODE: This is a read-only diagnostic tool. It will NOT mutate the database.
 * Use this to verify logic for a single product before running the full sync.
 */

import { readFileSync, existsSync } from 'fs';
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
    console.log(`\n➡️  Step 1: Repository Ranking & Selection...`);

    let finalRepo: any = null;
    const cleanProd = sanitize(productNameArg!);

    if (repoOverride) {
        console.log(`   ⚙️ Using override repository: "${repoOverride}"...`);
        const searchRes = await AzureService.searchCode(devops.organization, `repo:${repoOverride} ext:tf`, devops.pat, devops.baseUrl, bearerToken);
        finalRepo = searchRes.results?.[0]?.repository;
        if (!finalRepo) {
            const repos = await AzureService.searchCode(devops.organization, `${repoOverride}`, devops.pat, devops.baseUrl, bearerToken);
            finalRepo = repos.results?.find((r: any) => sanitize(r.repository.name) === sanitize(repoOverride))?.repository;
        }
    } else {
        const quotedName = productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg;
        console.log(`   📡 Searching for: ${quotedName}`);
        const res = await AzureService.searchCode(devops.organization, quotedName!, devops.pat, devops.baseUrl, bearerToken);

        if (res.count === 0) {
            console.log(`   ❌ No repositories found for "${productNameArg}".`);
            console.log(`   🔎 Trying fallback (sanitized name)...`);
            const fallback = await AzureService.searchCode(devops.organization, cleanProd, devops.pat, devops.baseUrl, bearerToken);
            if (fallback.count > 0) {
                res.results = fallback.results;
                res.count = fallback.count;
            }
        }

        if (!res.results || res.results.length === 0) {
            console.log(`   ❌ Discovery failed to find any candidate repositories.`);
            return;
        }

        const candidates = res.results.map((r: any) => {
            const rName = r.repository?.name;
            if (!rName) return { score: -1000 };
            const cleanRepo = sanitize(rName);
            let score = 20;
            if (cleanRepo === cleanProd) score += 100;
            else if (cleanRepo.includes(cleanProd)) score += 50;
            else if (cleanProd.includes(cleanRepo)) score += 30;

            // Penalize DevOps specific repositories
            if (cleanRepo.includes('devops') || cleanRepo.includes('pipeline') || cleanRepo.includes('iac') || cleanRepo.includes('-gitops')) {
                score -= 40;
            }

            if (cleanRepo.includes('grp') && cleanRepo !== cleanProd) score -= 20;
            if ((cleanRepo.includes('shared') || cleanRepo.includes('common')) && cleanRepo !== cleanProd) score -= 30;
            if (r.path?.toLowerCase().includes('terraform') || r.path?.toLowerCase().includes('.tf')) score += 10;
            return { repo: r.repository, score, name: rName, path: r.path };
        }).sort((a: any, b: any) => b.score - a.score);

        if (candidates.length === 0) {
            console.log(`   ⚠️  No candidates found in search results.`);
            return;
        }

        if (verbose) {
            console.log(`\n   📊 Candidate Ranking:`);
            candidates.slice(0, 5).forEach((c: any) => console.log(`      - [${c.score.toString().padStart(3)}] ${c.name} (${c.path})`));
        }

        finalRepo = candidates[0].repo;
        console.log(`   🎯 Selected Winner: ${finalRepo.name} (Score: ${candidates[0].score})`);
    }

    if (!finalRepo) return;

    // --- MANDATORY METADATA RECOVERY ---
    let project = "Unknown";
    let projectIdent = "Unknown";
    const primaryRepoName = finalRepo.name;
    const primaryRepoId = finalRepo.id;

    try {
        console.log(`\n🔎 Authorizing Repository Metadata: ${primaryRepoName}...`);
        const details = await AzureService.fetchRepoById(devops.organization, primaryRepoId || primaryRepoName, devops.pat, devops.baseUrl, bearerToken);
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
    console.log(`\n➡️  Step 2: Pipeline Discovery...`);
    try {
        await AzureService.verifyAdoConnection(devops.organization, devops.pat, devops.baseUrl, bearerToken);
    } catch (err: any) {
        console.error(`❌ [AUTH] PAT/Token Verification failed: ${err.message}`);
        process.exit(1);
    }

    const runDiscovery = async () => {
        console.log(`   ⏳ Fetching all pipeline types...`);

        const safeFetch = async (fn: () => Promise<any[]>, label: string) => {
            try {
                return await fn();
            } catch (e: any) {
                console.warn(`      ⚠️  [Discovery] ${label} lookup failed: ${e.message}`);
                return [];
            }
        };

        const [yamlPipes, buildDefs, releaseDefs, projPipes, projBuilds] = await Promise.all([
            safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl, bearerToken), 'YAML Pipelines'),
            safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl, bearerToken), 'Build Definitions'),
            safeFetch(() => AzureService.fetchADOReleaseDefinitions(devops.organization, projectIdentifier, devops.pat, devops.baseUrl, bearerToken), 'Release Definitions'),
            safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl, bearerToken), 'Proj YAML'),
            safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl, bearerToken), 'Proj Build')
        ]);

        let combined = [
            ...yamlPipes.map(p => ({ ...p, type: 'YAML', priority: 200 })),
            ...buildDefs.map(p => ({ ...p, type: 'Classic Build', priority: 200 })),
            ...releaseDefs.map(r => ({ ...r, type: 'Classic Release', isRelease: true, priority: 200 })),
            ...projPipes.map(p => ({ ...p, type: 'YAML (Proj)', priority: 0 })),
            ...projBuilds.map(p => ({ ...p, type: 'Classic Build (Proj)', priority: 0 }))
        ];

        const seen = new Set();
        return combined.filter(p => {
            const key = `${p.type}-${p.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const runRepoBasedDiscovery = async (): Promise<any[]> => {
        console.log(`   🎯 Attempting Repo-Name-Based Pipeline Discovery...`);

        // Extract search term from repo name: "Alerts-IaC" -> "Alerts"
        let searchTerm = primaryRepoName.replace(/-IaC$/i, '').replace(/-Deploy$/i, '').replace(/-GitOps$/i, '');

        // Also try product name as fallback
        const productSearchTerm = productNameArg!.replace(/-IaC$/i, '').replace(/-Deploy$/i, '');

        console.log(`      🔎 Searching for pipelines matching: "${searchTerm}" (from repo: ${primaryRepoName})`);

        const safeFetch = async (fn: () => Promise<any[]>, label: string) => {
            try {
                return await fn();
            } catch (e: any) {
                console.warn(`      ⚠️  [Repo Discovery] ${label} lookup failed: ${e.message}`);
                return [];
            }
        };

        // Fetch all pipelines in the project
        const [yamlPipes, buildDefs] = await Promise.all([
            safeFetch(() => AzureService.fetchADOPipelines(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl, bearerToken), 'YAML Pipelines'),
            safeFetch(() => AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl, bearerToken), 'Build Definitions')
        ]);

        const allPipelines = [
            ...yamlPipes.map(p => ({ ...p, type: 'Repo-Based YAML' })),
            ...buildDefs.map(p => ({ ...p, type: 'Repo-Based Build' }))
        ];

        // Filter by name match
        const cleanSearch = sanitize(searchTerm);
        const cleanProduct = sanitize(productSearchTerm);

        const matchedPipelines = allPipelines.filter(p => {
            const cleanName = sanitize(p.name);
            return cleanName.includes(cleanSearch) ||
                cleanName.includes(cleanProduct) ||
                (cleanSearch.length > 3 && cleanName.includes(cleanSearch.substring(0, cleanSearch.length - 1)));
        });

        console.log(`      ✅ Found ${matchedPipelines.length} pipelines matching repo/product name.`);

        return matchedPipelines.map(p => ({ ...p, priority: 400 }));
    };

    const runSurgicalDiscovery = async (): Promise<any[]> => {
        console.log(`   ⏳ Attempting Surgical Pipeline Discovery (Environment -> Deployment -> Pipeline)...`);
        const searchEnvs = ['PROD', 'STAGE', 'QA', 'DEV'];
        const foundPipes = new Map<number, any>();

        for (const envName of searchEnvs) {
            console.log(`      🔎 Checking environment: ${envName}...`);
            const envUrl = `${devops.baseUrl}/${devops.organization}/${encodeURIComponent(projectIdentifier)}/_apis/distributedtask/environments?name=${envName}`;
            try {
                const resp = await fetch(envUrl, {
                    headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
                });
                if (resp.ok) {
                    const data = await resp.json() as { count: number; value: any[] };
                    const match = data.value.find((e: any) => e.name.toUpperCase() === envName);
                    if (match) {
                        const envDeploys = await AzureService.fetchEnvironmentDeployments(devops.organization, projectIdentifier, match.id, devops.pat, devops.baseUrl, bearerToken);
                        console.log(`      ✅ Found ${envDeploys.length} recent deployments in ${envName}.`);

                        for (const d of envDeploys) {
                            if (d.definition && d.definition.id) {
                                const pipe = {
                                    ...d.definition,
                                    type: 'Surgical (Live)',
                                    priority: 300,
                                    _links: { web: { href: `${devops.baseUrl}/${devops.organization}/${projectIdentifier}/_build?definitionId=${d.definition.id}` } }
                                };
                                foundPipes.set(d.definition.id, pipe);
                            }
                        }
                        if (foundPipes.size > 0) break; // Found something, stop looking at other envs
                    }
                }
            } catch (e) {
                console.warn(`      ⚠️  Surgical lookup for ${envName} failed.`);
            }
        }
        return Array.from(foundPipes.values());
    };

    // STRATEGY: Repo-Name-Based -> Surgical -> General Discovery
    let pipelines = await runRepoBasedDiscovery();

    if (pipelines.length === 0) {
        console.log(`   ⚠️  Repo-based discovery found no matches. Trying surgical discovery...`);
        pipelines = await runSurgicalDiscovery();
    } else {
        console.log(`   ✅ Repo-based discovery found ${pipelines.length} matching pipelines.`);
    }

    if (pipelines.length === 0) {
        console.log(`   ⚠️  Surgical discovery failed or returned no results. Falling back to general discovery...`);
        pipelines = await runDiscovery();
    }

    if (pipelines.length === 0) {
        console.log(`   ❌ No pipelines found for this repository.`);
        return;
    }

    // --- STEP 3: PIPELINE MATCHING ---
    console.log(`\n➡️  Step 3: Matching Pipeline...`);
    const cleanProduct = sanitize(productNameArg!);

    const pipelineCandidates = pipelines.map(p => {
        const pName = p.name;
        const cleanPipe = sanitize(pName);
        const folder = sanitize(p.folder || '');
        let score = (p as any).priority || 0; // Start with priority bonus
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

    let latestBuild: any = null;

    if ((matchedPipeline as any).isRelease) {
        // Handle Classic Release Pipelines separately
        console.log(`      📡 [Classic Release] Fetching releases for definition ${matchedPipeline.id}...`);
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
        // Use the new efficient Builds API for YAML pipelines
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
            const builds = await AzureService.fetchBuildsByDefinition(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
            console.log(`   📡 [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds...`);

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
                    timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, runProject, run.id, devops.pat, devops.baseUrl, bearerToken));
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

    console.log(`\n✅ Final Seed Data:`);
    console.log(JSON.stringify({ product: productNameArg, repo: primaryRepoName, project, pipeline: matchedPipeline.name, deployments }, null, 2));
}

runDebug().catch(err => console.error(`\n💥 Fatal Error:`, err));
