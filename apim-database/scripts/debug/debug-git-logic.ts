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
const quiet = args.includes('--quiet');

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

/**
 * Recursive search for Git SHA (40 char hex) in any object
 */
function findGitSha(obj: any, path: string = ''): { path: string; value: string }[] {
    const shas: { path: string; value: string }[] = [];
    if (!obj || typeof obj !== 'object') return shas;

    for (const key in obj) {
        const val = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof val === 'string' && /^[0-9a-f]{40}$/i.test(val)) {
            shas.push({ path: currentPath, value: val });
        } else if (typeof val === 'object' && val !== null) {
            shas.push(...findGitSha(val, currentPath));
        }
    }
    return shas;
}
async function runDebug() {
    console.log(`\n🕵️‍♀️ DEBUG: Git/Pipeline Discovery Test`);
    console.log(`   Target Product: "${productNameArg}"`);
    console.log(`   Target Env:     ${envArg}`);
    if (repoOverride) console.log(`   🛠️  Repo Override: "${repoOverride}"`);

    // --- STEP 1: REPOSITORY DISCOVERY ---
    console.log(`\n➡️  Step 1: Repository Ranking & Selection...`);

    let finalRepo: any = null;
    const cleanProd = sanitize(productNameArg!);

    if (repoOverride) {
        console.log(`   ⚙️ Using override repository: "${repoOverride}"...`);
        const searchRes = await AzureService.searchCode(devops.organization, `repo:${repoOverride} ext:tf`, devops.pat, devops.baseUrl);
        finalRepo = searchRes.results?.[0]?.repository;
        if (!finalRepo) {
            const repos = await AzureService.searchCode(devops.organization, `${repoOverride}`, devops.pat, devops.baseUrl);
            finalRepo = repos.results?.find((r: any) => sanitize(r.repository.name) === sanitize(repoOverride))?.repository;
        }
    } else {
        const quotedName = productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg;
        // Search without extension filter first as it's more reliable for discovery
        console.log(`   📡 Searching for: ${quotedName}`);
        const res = await AzureService.searchCode(devops.organization, quotedName!, devops.pat, devops.baseUrl);

        if (res.count === 0) {
            console.log(`   ❌ No repositories found for "${productNameArg}".`);
            // Fallback: try sanitized name
            console.log(`   🔎 Trying fallback (sanitized name)...`);
            const fallback = await AzureService.searchCode(devops.organization, cleanProd, devops.pat, devops.baseUrl);
            if (fallback.count > 0) {
                res.results = fallback.results;
                res.count = fallback.count;
            }
        }

        if (!res.results || res.results.length === 0) {
            console.log(`   ❌ Discovery failed to find any candidate repositories.`);
            return;
        }

        // --- RANKING LOGIC ---
        const candidates = res.results.map((r: any) => {
            const rName = r.repository?.name;
            if (!rName) return { score: -1000 };

            const cleanRepo = sanitize(rName);
            let score = 20; // Base score for appearing in search results

            if (cleanRepo === cleanProd) score += 100;
            else if (cleanRepo.includes(cleanProd)) score += 50;
            else if (cleanProd.includes(cleanRepo)) score += 30; // Inverse match

            // Penalty for GRP/shared/common (softened)
            if (cleanRepo.includes('grp') && cleanRepo !== cleanProd) score -= 20;
            if ((cleanRepo.includes('shared') || cleanRepo.includes('common')) && cleanRepo !== cleanProd) score -= 30;

            // Give a small boost if the file path contains terraform/tf
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

    if (!finalRepo) {
        console.log(`   ❌ Could not identify a repository.`);
        return;
    }

    // --- MANDATORY METADATA RECOVERY ---
    // Search results often have incomplete or stale project metadata (project ID).
    // We always call the direct repository API to get the authoritative project name and ID.
    let project = "Unknown";
    let projectIdent = "Unknown";
    const primaryRepoName = finalRepo.name;
    const primaryRepoId = finalRepo.id;

    try {
        console.log(`\n🔎 Authorizing Repository Metadata: ${primaryRepoName}...`);
        const details = await AzureService.fetchRepoById(devops.organization, primaryRepoId || primaryRepoName, devops.pat, devops.baseUrl);
        project = details.project.name;
        projectIdent = details.project.id;
        (finalRepo as any).webUrl = details.webUrl;
        console.log(`   ✅ Authorized: Project="${project}"`);
        console.log(`   📇 Project ID: ${projectIdent}`);
    } catch (e: any) {
        console.warn(`   ⚠️  Failed to recover project metadata: ${e.message}`);
        // Fallback to what we have if recovery fails
        project = finalRepo.project?.name || project;
        projectIdent = finalRepo.project?.id || project;
    }

    const projectIdentifier = projectIdent || project;
    const repoWebUrl = (finalRepo as any).webUrl || `${devops.baseUrl}/${devops.organization}/${project}/_git/${primaryRepoName}`;
    console.log(`   🔗 Repo URL: ${repoWebUrl}`);

    // --- STEP 2: PIPELINE DISCOVERY ---
    console.log(`\n➡️  Step 2: Pipeline Discovery...`);

    // Verify PAT connection first
    try {
        await AzureService.verifyAdoConnection(devops.organization, devops.pat, devops.baseUrl);
    } catch (err: any) {
        console.error(`❌ [AUTH] PAT Verification failed: ${err.message}`);
        process.exit(1);
    }

    let pipelines: any[] = [];

    const runDiscovery = async () => {
        console.log(`   ⏳ Fetching all pipeline types (YAML, Classic, Release) for Repo and Project...`);

        const [yamlPipes, buildDefs, releaseDefs, projPipes, projBuilds] = await Promise.all([
            AzureService.fetchADOPipelines(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl),
            AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl),
            AzureService.fetchADOReleaseDefinitions(devops.organization, projectIdentifier, devops.pat, devops.baseUrl),
            AzureService.fetchADOPipelines(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl),
            AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, '', devops.pat, devops.baseUrl)
        ]);

        let combined = [
            ...yamlPipes.map(p => ({ ...p, type: 'YAML' })),
            ...buildDefs.map(p => ({ ...p, type: 'Classic Build' })),
            ...releaseDefs.map(r => ({ ...r, type: 'Classic Release', isRelease: true })),
            ...projPipes.map(p => ({ ...p, type: 'YAML (Proj)' })),
            ...projBuilds.map(p => ({ ...p, type: 'Classic Build (Proj)' }))
        ];

        // De-duplicate by ID (Pipelines and Build Definitions often share IDs or overlap)
        const seen = new Set();
        return combined.filter(p => {
            const key = `${p.type}-${p.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    pipelines = await runDiscovery();

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

        // Exact match bonus
        if (cleanPipe === cleanProduct) score += 100;

        // Product name match
        if (cleanPipe.includes(cleanProduct)) score += 50;

        // Folder match bonus
        if (folder.includes(cleanProduct)) score += 20;

        // Common deployment keywords
        if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
        if (cleanPipe.includes('apim')) score += 5;

        // Penalty for generic names or non-product names
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
        const typeStr = (matchedPipeline as any).type || 'Pipeline';
        console.log(`   ✅ Best Match: ${matchedPipeline.name} (ID: ${matchedPipeline.id}, Type: ${typeStr})`);
        console.log(`      🔗 URL: ${matchedPipeline._links?.web?.href || 'N/A'}`);
    }

    // --- STEP 4: SURGICAL ENVIRONMENT SYNC (HYBRID STRATEGY) ---
    console.log(`\n➡️  Step 4: Surgical Environment Hash Sync (Hybrid Strategy)...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string }> = {};
    const timelineCache = new Map<number, any[]>();

    console.log(`   ⏳ Attempting surgical strikes (Environments API)...`);
    console.log(`   📂 Project Context: ${projectIdentifier}`);

    for (const envName of envsToSync) {
        let deploy: any = null;

        if ((matchedPipeline as any).isRelease) {
            // Use Release API
            const releases = await AzureService.fetchADOReleases(devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl);
            const latest = releases.find(r =>
                r.environments?.some(e => e.name.toUpperCase() === envName && e.status?.toLowerCase() === 'succeeded')
            );
            if (latest) {
                const env = latest.environments.find(e => e.name.toUpperCase() === envName);
                deploy = {
                    build: { sourceVersion: latest.artifacts?.[0]?.definitionReference?.version?.id },
                    finishTime: env?.deploySteps?.[0]?.queuedOn || latest.modifiedOn
                };
            }
        } else {
            // Use Environments API
            deploy = await AzureService.fetchLatestEnvironmentDeployment(
                devops.organization, projectIdentifier, matchedPipeline.id, envName, devops.pat, devops.baseUrl
            );
        }

        if (deploy) {
            const commitHash = deploy.build?.sourceVersion || 'unknown';
            deployments[envName] = {
                hash: commitHash,
                date: deploy.finishTime || deploy.startTime
            };
            console.log(`      🎯 ${envName.padEnd(5)}: Surgical Hit! Captured ${commitHash.substring(0, 7)} (Deployment ${deploy.id})`);
        }
    }

    // Fallback: If any environments were missed, use the Paginated Timeline Scanner
    const missingEnvs = envsToSync.filter(e => !deployments[e]);
    if (missingEnvs.length > 0) {
        console.log(`   🔍 Missed ${missingEnvs.length} envs. Falling back to paginated timeline scan (Depth: 100)...`);

        let skip = 0;
        const pageSize = 20;
        const maxDepth = 100;

        while (Object.keys(deployments).length < envsToSync.length && skip < maxDepth) {
            const builds = await AzureService.fetchBuildsByDefinition(
                devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl, undefined, pageSize, skip
            );

            console.log(`   📡 [Scan] Page ${Math.floor(skip / pageSize) + 1}: Found ${builds.length} builds for Definition ${matchedPipeline.id}`);

            if (builds.length === 0 && skip === 0) {
                console.log(`   ⚠️  No builds found for this definition. Trying a broader search across the repo...`);
                const allRepoBuilds = await AzureService.fetchADOBuilds(devops.organization, projectIdentifier, (matchedPipeline as any).repositoryId || primaryRepoId, devops.pat, devops.baseUrl);
                console.log(`   📡 [Scan] Broad search found ${allRepoBuilds.length} builds total for this repository.`);
                if (allRepoBuilds.length > 0) {
                    // Inject these for scanning
                    builds.push(...allRepoBuilds.slice(0, 20));
                }
            }

            if (builds.length === 0) break;

            for (const run of builds) {
                if (Object.keys(deployments).length === envsToSync.length) break;

                if (!timelineCache.has(run.id)) {
                    timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdentifier, run.id, devops.pat, devops.baseUrl));
                }

                const timeline = timelineCache.get(run.id)!;
                for (const envName of envsToSync) {
                    if (deployments[envName]) continue;

                    const record = timeline.find((t: any) => {
                        const type = (t.type || '').toLowerCase();
                        const status = (t.status || '').toLowerCase();
                        const result = (t.result || '').toLowerCase();
                        const isContainer = ['stage', 'job', 'phase'].includes(type);
                        const cleanTName = sanitize(t.name);
                        const cleanEnvName = sanitize(envName);
                        const nameMatches = cleanTName.includes(cleanEnvName);
                        const isSuccess = result === 'succeeded' || result === 'partiallysucceeded';
                        const isComplete = status === 'completed';

                        // Verbose diagnostic for potential environment matches
                        if (nameMatches) {
                            if (!isContainer) {
                                // console.log(`      ℹ️  [Scan] Found name match '${t.name}' but type is '${type}' (Skipped)`);
                            } else if (!isComplete || !isSuccess) {
                                console.log(`      ⚠️  [Scan] Found '${t.name}' in Build ${run.id}, but Result='${result}', Status='${status}' (Skipped)`);
                            }
                        }

                        return isContainer && nameMatches && isSuccess && isComplete;
                    });

                    if (!record && timeline.length > 0 && run === builds[0]) {
                        // Diagnostic sampling: If the FIRST scanned build has no match, show what it DOES have
                        console.log(`      ⚠️  [Scan] No match for '${envName}' in Build ${run.id}. Sample of records:`);
                        timeline.slice(0, 10).forEach(t => console.log(`         - [${t.type}] ${t.name} (Result=${t.result}, Status=${t.status})`));
                    }

                    if (record) {
                        const commitHash = (run as any).sourceVersion || 'unknown';
                        deployments[envName] = {
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

    // Report missing envs
    envsToSync.forEach(env => {
        if (!deployments[env]) console.log(`      📍 ${env.padEnd(5)}: (No successful deployment found in last 100 builds)`);
    });

    console.log(`\n📊 Efficiency Report:`);
    console.log(`   - Environments Found: ${Object.keys(deployments).length} / ${envsToSync.length}`);
    console.log(`   - Discovery Mode: ${missingEnvs.length === 0 ? '🟢 SURGICAL HIT' : '🟡 HYBRID SCAN'}`);

    console.log(`\n✅ Final Seed Data:`);
    console.log(JSON.stringify({
        product: productNameArg,
        repo: primaryRepoName,
        project: project,
        pipeline: matchedPipeline.name,
        deployments
    }, null, 2));
}

runDebug().catch(err => console.error(`\n💥 Fatal Error:`, err));
