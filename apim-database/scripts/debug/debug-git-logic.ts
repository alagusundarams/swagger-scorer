import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'DEV';
const repoOverride = args.find(a => a.startsWith('--repo='))?.split('=')[1];
const verbose = args.includes('--verbose');

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
        const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
        console.log(`   📡 Searching for: ${searchTerm}`);
        const res = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl);

        if (res.count === 0) {
            console.log(`   ❌ No repositories found containing product name in TF files.`);
            // Fallback: try without extension filter
            console.log(`   🔎 Trying fallback (no extension filter)...`);
            const fallback = await AzureService.searchCode(devops.organization, quotedName!, devops.pat, devops.baseUrl);
            if (fallback.count === 0) return;
            res.results = fallback.results;
        }

        // --- RANKING LOGIC ---
        const cleanProd = sanitize(productNameArg!);
        const candidates = res.results.map((r: any) => {
            const rName = r.repository.name;
            const cleanRepo = sanitize(rName);
            let score = 0;

            if (cleanRepo === cleanProd) score += 100;
            else if (cleanRepo.includes(cleanProd)) score += 50;

            // Penalty for GRP
            if (cleanRepo.includes('grp')) score -= 20;
            if (cleanRepo.includes('shared') || cleanRepo.includes('common')) score -= 30;

            return { repo: r.repository, score, name: rName, isGrp: cleanRepo.includes('grp') };
        }).sort((a: any, b: any) => b.score - a.score);

        if (verbose) {
            console.log(`\n   📊 Candidate Ranking:`);
            candidates.slice(0, 10).forEach((c: any) => console.log(`      - [${c.score.toString().padStart(3)}] ${c.name} ${c.isGrp ? '(GRP)' : ''}`));
        }

        finalRepo = candidates[0].repo;
        console.log(`   🎯 Selected Winner: ${finalRepo.name} (Score: ${candidates[0].score})`);
    }

    if (!finalRepo) {
        console.log(`   ❌ Could not identify a repository.`);
        return;
    }

    const primaryRepoName = finalRepo.name;
    const primaryRepoId = finalRepo.id;
    let project = finalRepo.project?.name || "Unknown";
    let projectId = finalRepo.project?.id || "";

    if (project === "Unknown" || !projectId) {
        try {
            const repoDetails = await AzureService.fetchRepoById(devops.organization, primaryRepoId, devops.pat, devops.baseUrl);
            project = repoDetails.project.name;
            projectId = repoDetails.project.id;
            console.log(`      ✅ Recovered Project: ${project}`);
        } catch (e) { }
    }

    const projectIdentifier = projectId || project;

    // --- STEP 2: PIPELINE DISCOVERY ---
    console.log(`\n➡️  Step 2: Pipeline Discovery (with CLI Token fallback)...`);
    let pipelines: any[] = [];

    let cliToken = "";
    try {
        cliToken = await AzureService.getAzureAccessToken("499b84ee-1328-4417-95a1-8288018c668b");
    } catch (e) { }

    const runDiscovery = async (tokenOverride?: string) => {
        let results = await AzureService.fetchADOPipelines(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl, tokenOverride);
        if (results.length === 0) {
            results = await AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl, tokenOverride);
        }
        return results;
    };

    pipelines = await runDiscovery();
    if (pipelines.length === 0 && cliToken) pipelines = await runDiscovery(cliToken);

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
        let score = 0;

        if (cleanPipe.includes(cleanProduct)) score += 50;
        if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
        if (cleanPipe.includes('apim')) score += 5;

        return { pipe: p, score, name: pName };
    }).sort((a, b) => b.score - a.score);

    const matchedPipeline = pipelineCandidates[0].pipe;
    if (pipelineCandidates[0].score < 10) {
        console.log(`   ⚠️  LOW CONFIDENCE MATCH: ${matchedPipeline.name}.`);
    } else {
        console.log(`   ✅ Best Match: ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);
    }

    // --- STEP 4: SURGICAL ENVIRONMENT SYNC ---
    console.log(`\n➡️  Step 4: Surgical Environment Hash Sync (Scale-Optimized)...`);
    const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
    const deployments: Record<string, { hash: string; date: string }> = {};

    console.log(`   ⏳ Fetching latest builds from main (rich metadata)...`);
    const runs = await AzureService.fetchBuildsByDefinition(devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl, cliToken);

    const SCAN_DEPTH = 15;
    const timelineCache = new Map<number, any[]>();
    let apiCyclesAvoided = 0;
    let timelinesFetched = 0;

    // Optimized Scan: One pass over runs, surgical timeline fetching
    for (const run of runs.slice(0, SCAN_DEPTH)) {
        // Early Exit: Stop if we found all environments
        const foundCount = Object.keys(deployments).length;
        if (foundCount === envsToSync.length) {
            apiCyclesAvoided += (SCAN_DEPTH - timelinesFetched - (apiCyclesAvoided));
            break;
        }

        // Optimization: Only scan successful/partially successful runs
        const runResult = (run as any).result || (run as any).state;
        if (runResult !== 'succeeded' && runResult !== 'partiallySucceeded' && runResult !== 'completed') {
            apiCyclesAvoided++;
            continue;
        }

        if (!timelineCache.has(run.id)) {
            timelinesFetched++;
            const tl = await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdentifier, run.id, devops.pat, devops.baseUrl, cliToken);
            timelineCache.set(run.id, tl);

            if (verbose && timelinesFetched === 1) {
                const containers = tl.filter(t => ['stage', 'job', 'phase'].includes(t.type?.toLowerCase()));
                console.log(`      🔍 Run ${run.id} Containers: ${containers.map(c => `${c.name} (${c.type}:${c.result})`).join(', ')}`);

                // Forensic Hash Discovery
                const potentialShas = findGitSha(run);
                if (potentialShas.length > 0) {
                    console.log(`      🔍 DEBUG: Forensic SHA Discovery (Top level or nested):`);
                    potentialShas.forEach(s => console.log(`         - [${s.path}]: ${s.value}`));
                }
            }
        }

        const timeline = timelineCache.get(run.id)!;
        for (const envName of envsToSync) {
            if (deployments[envName]) continue;

            // Match stage, job, or phase
            const record = timeline.find((t: any) => {
                const type = (t.type || '').toLowerCase();
                const isContainer = ['stage', 'job', 'phase'].includes(type);
                const nameMatches = sanitize(t.name).includes(sanitize(envName));
                const isSuccess = t.result === 'succeeded' || t.result === 'partiallySucceeded';
                return isContainer && nameMatches && isSuccess;
            });

            if (record) {
                // Determine Hash via findGitSha (Forensic fallback)
                const shas = findGitSha(run);
                const commitHash = shas.length > 0 ? shas[0].value : 'unknown';

                deployments[envName] = {
                    hash: commitHash,
                    date: record.finishTime || run.finishedDate
                };
                console.log(`      📍 ${envName.padEnd(5)}: Captured ${commitHash.substring(0, 7)} (Run ${run.id} via ${record.name})`);
            }
        }
    }

    // Report missing envs
    envsToSync.forEach(env => {
        if (!deployments[env]) console.log(`      📍 ${env.padEnd(5)}: (No successful deployment found in last ${SCAN_DEPTH} runs)`);
    });

    console.log(`\n📊 Efficiency Report:`);
    console.log(`   - Timelines Fetched: ${timelinesFetched}`);
    console.log(`   - API Cycles Avoided: ${apiCyclesAvoided}`);
    console.log(`   - Scale Readiness: ${apiCyclesAvoided > 3 ? '🟢 OPTIMIZED' : '🟡 SCANNING...'}`);

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
