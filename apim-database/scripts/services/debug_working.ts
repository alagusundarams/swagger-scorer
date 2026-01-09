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
        bearerToken = await AzureService.getAzureAccessToken('499b84a3-100d-4558-8351-c1e149307c81');
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
            ...yamlPipes.map(p => ({ ...p, type: 'YAML' })),
            ...buildDefs.map(p => ({ ...p, type: 'Classic Build' })),
            ...releaseDefs.map(r => ({ ...r, type: 'Classic Release', isRelease: true })),
            ...projPipes.map(p => ({ ...p, type: 'YAML (Proj)' })),
            ...projBuilds.map(p => ({ ...p, type: 'Classic Build (Proj)' }))
        ];

        const seen = new Set();
        return combined.filter(p => {
            const key = `${p.type}-${p.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
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

    let pipelines = await runSurgicalDiscovery();

    if (pipelines.length === 0) {
        console.log(`   ⚠️  Surgical discovery failed or returned no results. Falling back to general discovery...`);
        pipelines = await runDiscovery();
    } else {
        console.log(`   ✅ Surgical discovery found ${pipelines.length} likely live pipelines.`);
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

    // --- STEP 4: SURGICAL ENVIRONMENT SYNC ---
    console.log(`\n➡️  Step 4: Surgical Environment Hash Sync (Hybrid Strategy)...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string; branch?: string; author?: string; message?: string; url?: string }> = {};
    const timelineCache = new Map<number, any[]>();

    console.log(`   ⏳ Attempting surgical strikes for ${matchedPipeline.name} (ID: ${matchedPipeline.id})...`);
    for (const envName of envsToSync) {
        let deploy: any = null;
        console.log(`      🔎 Checking ${envName}...`);
        if ((matchedPipeline as any).isRelease) {
            const releases = await AzureService.fetchADOReleases(devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
            const latest = releases.find(r => r.environments?.some(e => e.name.toUpperCase() === envName && e.status?.toLowerCase() === 'succeeded'));
            if (latest) {
                const env = latest.environments.find(e => e.name.toUpperCase() === envName);
                deploy = {
                    build: { sourceVersion: latest.artifacts?.[0]?.definitionReference?.version?.id },
                    finishTime: env?.deploySteps?.[0]?.queuedOn || latest.modifiedOn,
                    sourceBranch: latest.artifacts?.[0]?.definitionReference?.branch?.name || 'unknown',
                    requestedFor: latest.createdBy,
                    url: latest._links?.web?.href
                };
            }
        } else {
            console.log(`      📡 [Surgical] Searching deployments for ${envName}...`);
            deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, projectIdentifier, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
        }

        if (deploy) {
            let commitHash = deploy.build?.sourceVersion;
            let fullDetails = deploy;

            // If missing, try to resolve via owner (Run/Build ID)
            if (!commitHash && deploy.owner?.id) {
                fullDetails = await AzureService.fetchADOBuild(devops.organization, projectIdentifier, deploy.owner.id, devops.pat, devops.baseUrl, bearerToken);
                commitHash = fullDetails?.sourceVersion;
            }

            if (commitHash && commitHash !== 'unknown') {
                deployments[envName] = {
                    hash: commitHash,
                    date: deploy.finishTime || deploy.startTime || fullDetails.finishTime,
                    branch: fullDetails.sourceBranch || deploy.sourceBranch || 'unknown',
                    author: fullDetails.requestedFor?.displayName || deploy.requestedFor?.displayName || 'Unknown',
                    message: fullDetails.triggerInfo?.['ci.message'] || 'No message',
                    url: fullDetails._links?.web?.href || deploy.url
                };
                console.log(`      🎯 ${envName.padEnd(5)}: Surgical Hit! Captured ${commitHash.substring(0, 7)}`);
                console.log(`         👤 Author: ${deployments[envName].author}`);
                console.log(`         🌿 Branch: ${deployments[envName].branch}`);
            } else {
                console.warn(`      ⚠️  ${envName.padEnd(5)}: Found deployment but could not extract commit hash.`);
                if (verbose) console.log(`         DEBUG: Raw Deploy Object Keys: ${Object.keys(deploy).join(', ')}`);
                if (verbose && deploy.owner) console.log(`         DEBUG: Owner ID: ${deploy.owner.id} (${deploy.owner.name})`);
            }
        } else {
            console.log(`      ℹ️  ${envName.padEnd(5)}: No direct surgical strike results found.`);
        }
    }

    const missingEnvs = envsToSync.filter(e => !deployments[e]);
    if (missingEnvs.length > 0) {
        console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to paginated timeline scan (Depth: 100)...`);
        let skip = 0;
        const pageSize = 20;
        const maxDepth = 100;

        while (Object.keys(deployments).length < envsToSync.length && skip < maxDepth) {
            const builds = await AzureService.fetchBuildsByDefinition(devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken, pageSize, skip);
            console.log(`   📡 [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds...`);

            if (builds.length === 0 && skip === 0) {
                console.log(`   ⚠️ No builds found for definition. Trying broader search...`);
                let broadBuilds = await AzureService.fetchADOBuilds(devops.organization, projectIdentifier, (matchedPipeline as any).repositoryId || primaryRepoId, devops.pat, devops.baseUrl, bearerToken);
                if (broadBuilds.length === 0) {
                    broadBuilds = await AzureService.fetchADOBuilds(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl, bearerToken);
                }
                if (broadBuilds.length > 0) builds.push(...broadBuilds.slice(0, 20));
            }
            if (builds.length === 0) break;

            for (const run of builds) {
                if (Object.keys(deployments).length === envsToSync.length) break;
                if (!timelineCache.has(run.id)) {
                    timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdentifier, run.id, devops.pat, devops.baseUrl, bearerToken));
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
                        const hash = run.sourceVersion || 'unknown';
                        deployments[envName] = {
                            hash,
                            date: record.finishTime || run.finishedDate,
                            branch: run.sourceBranch,
                            author: run.requestedFor?.displayName,
                            message: run.triggerInfo?.['ci.message'] || 'No message',
                            url: run._links?.web?.href
                        };
                        console.log(`      📍 ${envName.padEnd(5)}: Scanner Hit! Captured ${hash.substring(0, 7)}`);
                        console.log(`         👤 Author: ${deployments[envName].author}`);
                        console.log(`         🌿 Branch: ${deployments[envName].branch}`);
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
