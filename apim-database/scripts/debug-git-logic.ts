import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from './services/AzureService.js';
import fetch from 'node-fetch';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'DEV';

if (help || !productNameArg) {
    console.log(`
Usage: 
  npx tsx scripts/debug-git-logic.ts --product="My Product Name" [--env=DEV|QA|STAGE|PROD]
    `);
    process.exit(0);
}

// --- CONFIG ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');

    if (existsSync(localConfig)) return JSON.parse(readFileSync(localConfig, 'utf8'));
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));

    console.error("❌ config.json not found. Looked in:");
    console.error(`   - ${localConfig}`);
    console.error(`   - ${rootConfig}`);
    process.exit(1);
}

const config = loadConfig();
const devops = config.devops;

if (!devops || !devops.pat) {
    console.error("❌ 'devops' section missing or incomplete in config.json");
    process.exit(1);
}

async function runDebug() {
    console.log(`\n🕵️‍♀️ DEBUG: Git/Pipeline Discovery Test`);
    console.log(`   Target Product: "${productNameArg}"`);
    console.log(`   Querying for: "${productNameArg}" ext:tf ext:tfvars`);
    console.log(`   Target Env: ${envArg}`);

    // 1. Repository Discovery via Search
    console.log(`\n➡️  Step 1: Code Search Discovery...`);
    const quotedName = productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg;

    // Test different term strategies
    const testStrategies = [
        { name: "Single Extension (tf)", term: `${quotedName} ext:tf` },
        { name: "OR Extensions", term: `${quotedName} (ext:tf OR ext:tfvars)` },
        { name: "No Extension (Baseline)", term: `${quotedName}` },
        { name: "Path Filter", term: `${quotedName} path:*.tf` }
    ];

    let searchRes: any = { count: 0, results: [] };
    let usedTerm = '';

    for (const strategy of testStrategies) {
        console.log(`   📡 Testing Strategy: ${strategy.name} ("${strategy.term}")`);
        const res = await AzureService.searchCode(devops.organization, strategy.term, devops.pat, devops.baseUrl);
        console.log(`      Hits: ${res.count}`);
        if (res.count > 0 && searchRes.count === 0) {
            searchRes = res;
            usedTerm = strategy.term;
            console.log(`      🎯 Selected this strategy.`);
        }
    }

    if (searchRes.count === 0) {
        console.log(`   ❌ All search strategies returned 0 results.`);
        return;
    }

    const matchedRepos = new Set<string>();
    searchRes.results?.forEach((r: any) => {
        if (r.repository?.name) matchedRepos.add(r.repository.name);
    });

    console.log(`   Matches found in repos: ${Array.from(matchedRepos).join(', ')}`);

    // COLLISION LOGIC TEST
    if (matchedRepos.size > 1) {
        console.log(`   ⚠️  COLLISION DETECTED: Product name appears in ${matchedRepos.size} different repositories.`);
        console.log(`      This usually happens for non-GRP generic products.`);
        console.log(`      Strategy: We would log an anomaly but proceed with the first/primary match.`);
    }

    if (searchRes.count > 25) {
        console.log(`   ⚠️  HIGH HIT COUNT (${searchRes.count}): Product name is extremely common.`);
        console.log(`      This increases the risk of 'false positives' in repo matching.`);
    }

    const firstResult = searchRes.results?.[0];
    if (!firstResult || !firstResult.repository) {
        console.log(`   ❌ No valid repository data in results.`);
        return;
    }

    const primaryRepoName = firstResult.repository.name;
    const primaryRepoId = firstResult.repository.id;
    let project = firstResult.repository.project?.name || "Unknown";
    let projectId = firstResult.repository.project?.id || "";

    if (project === "Unknown" || !projectId) {
        console.log(`   🔎 Project info missing in search result. Attempting recovery via Repo ID ${primaryRepoId}...`);
        try {
            const repoDetails = await AzureService.fetchRepoById(devops.organization, primaryRepoId, devops.pat, devops.baseUrl);
            project = repoDetails.project.name;
            projectId = repoDetails.project.id;
            console.log(`      ✅ Recovered Project: ${project} (ID: ${projectId})`);
        } catch (e) {
            console.log(`      ⚠️  Failed to recover project info. Repo Object:`, JSON.stringify(firstResult.repository, null, 2));
        }
    }

    const projectIdentifier = projectId || project;
    console.log(`   🎯 Selected Primary Repo: ${primaryRepoName} (ID: ${primaryRepoId}, Project: ${project})`);

    console.log(`   🎯 Selected Primary Repo: ${primaryRepoName} (ID: ${primaryRepoId}, Project: ${project})`);

    // 2. Locate YAML Pipeline
    console.log(`\n➡️  Step 2: Locating Pipeline for Repo...`);

    // Diagnostic log
    const cleanBase = devops.baseUrl.replace(/\/+$/, '');
    const isLegacy = cleanBase.includes('visualstudio.com');
    const urlBase = isLegacy ? `${cleanBase}/${projectIdentifier}` : `${cleanBase}/${devops.organization}/${projectIdentifier}`;
    const pipelineUrl = `${urlBase}/_apis/pipelines?api-version=7.1-preview.1&repositoryId=${primaryRepoId}&repositoryType=azureRepo`;
    console.log(`   📡 Fetching from: ${pipelineUrl}`);

    let pipelines = await AzureService.fetchADOPipelines(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl);
    console.log(`   Count via Pipelines API (repo filter): ${pipelines.length}`);

    if (pipelines.length === 0) {
        console.log(`   🔎 No Pipelines found. Attempting Build Definitions API (fallback)...`);
        pipelines = await AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, devops.baseUrl);
        console.log(`   Count via Build Definitions API: ${pipelines.length}`);
    }

    if (pipelines.length === 0) {
        console.log(`   ⚠️  No pipelines found via repo filter. Attempting to fetch ALL pipelines in project to find match...`);
        // Generic fetch (no repo filter)
        const allPipelines = await AzureService.fetchADOPipelines(devops.organization, projectIdentifier, "", devops.pat, devops.baseUrl);
        console.log(`   Total pipelines in project: ${allPipelines.length}`);

        // Manual filter
        pipelines = allPipelines;
    }

    if (pipelines.length === 0) {
        console.log(`   ❌ No pipelines found for this project.`);
        return;
    }

    const matchedPipeline = pipelines.find(p =>
        p.name.toLowerCase().includes(productNameArg!.toLowerCase()) ||
        p.name.toLowerCase().includes(primaryRepoName.toLowerCase())
    ) || pipelines[0];

    if (!matchedPipeline) {
        console.log(`   ❌ No pipeline could be matched.`);
        return;
    }

    console.log(`   ✅ Selected Pipeline: ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);

    // 3. Fetch Runs & Stage Discovery
    console.log(`\n➡️  Step 3: Fetching Recent Runs & Timelines...`);
    const runs = await AzureService.fetchPipelineRuns(devops.organization, projectIdentifier, matchedPipeline.id, devops.pat, devops.baseUrl);
    console.log(`   Found ${runs.length} recent runs.`);

    for (const run of runs.slice(0, 3)) { // Look at top 3
        console.log(`\n   --- Run ID: ${run.id} (${run.status}, Result: ${run.result}) ---`);
        const timeline = await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdentifier, run.id, devops.pat, devops.baseUrl);

        // Find environment stage
        const envStage = timeline.find((r: any) =>
            r.type === 'Stage' &&
            r.name.toLowerCase().includes(envArg.toLowerCase())
        );

        if (envStage) {
            console.log(`      📍 Env [${envArg}] Stage Found: ${envStage.name} (Result: ${envStage.result})`);
            if (envStage.result === 'succeeded') {
                console.log(`      💎 SUCCESS! Captured Hash: ${run.resources?.repositories?.self?.version || 'N/A'}`);
                console.log(`      📅 Deployed At: ${envStage.finishTime}`);
            }
        } else {
            console.log(`      📍 Env [${envArg}] Stage NOT found in this run.`);
        }

        // Find Production stage (Universal Visibility)
        const prodStage = timeline.find((r: any) =>
            r.type === 'Stage' &&
            (r.name.toLowerCase().includes('prod') || r.name.toLowerCase().includes('production'))
        );

        if (prodStage) {
            console.log(`      🌍 PRODUCTION Stage Found: ${prodStage.name} (Result: ${prodStage.result})`);
            if (prodStage.result === 'succeeded') {
                console.log(`      📡 PROD DATA: Hash=${run.resources?.repositories?.self?.version}, Date=${prodStage.finishTime}`);
            }
        }
    }

    console.log(`\n🏁 Debug Complete.`);
}

runDebug().catch(err => {
    console.error(`❌ Fatal Error:`, err);
});
