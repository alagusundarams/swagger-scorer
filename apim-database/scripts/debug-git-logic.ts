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
    const searchTerm = `${quotedName} ext:tf ext:tfvars`;
    const searchRes = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl);

    console.log(`   Found ${searchRes.count} hits in ADO Search.`);

    if (searchRes.count === 0) {
        console.log(`   ❌ No matches found for this product name.`);
        return;
    }

    const matchedRepos = new Set<string>();
    searchRes.results.forEach(r => matchedRepos.add(r.repository.name));

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

    const primaryRepoName = searchRes.results[0].repository.name;
    const primaryRepoId = searchRes.results[0].repository.id;
    const project = searchRes.results[0].repository.project.name;
    console.log(`   🎯 Selected Primary Repo: ${primaryRepoName} (ID: ${primaryRepoId}, Project: ${project})`);

    // 2. Locate YAML Pipeline
    console.log(`\n➡️  Step 2: Locating Pipeline for Repo...`);
    const pipelines = await AzureService.fetchADOPipelines(devops.organization, project, primaryRepoId, devops.pat, devops.baseUrl);

    if (pipelines.length === 0) {
        console.log(`   ❌ No pipelines found for this repo ID.`);
        return;
    }

    const matchedPipeline = pipelines.find(p =>
        p.name.toLowerCase().includes(primaryRepoName.toLowerCase()) ||
        p.url.toLowerCase().includes(primaryRepoName.toLowerCase())
    ) || pipelines[0]; // Fallback to first if only one exists

    console.log(`   ✅ Selected Pipeline: ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);

    // 3. Fetch Runs & Stage Discovery
    console.log(`\n➡️  Step 3: Fetching Recent Runs & Timelines...`);
    const runs = await AzureService.fetchPipelineRuns(devops.organization, project, matchedPipeline.id, devops.pat, devops.baseUrl);
    console.log(`   Found ${runs.length} recent runs.`);

    for (const run of runs.slice(0, 3)) { // Look at top 3
        console.log(`\n   --- Run ID: ${run.id} (${run.status}, Result: ${run.result}) ---`);
        const timeline = await AzureService.fetchPipelineRunTimeline(devops.organization, project, run.id, devops.pat, devops.baseUrl);

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
