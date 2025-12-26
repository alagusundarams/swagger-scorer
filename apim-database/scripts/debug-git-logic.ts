import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from './services/AzureService.js';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const explicitTagArg = args.find(a => a.startsWith('--tag='))?.split('=')[1]; // Optional: simulate a "repo:xyz" tag

if (help || !productNameArg) {
    console.log(`
Usage: 
  npx tsx scripts/debug-git-logic.ts --product="My Product Name" [--tag="repo:my-repo"]

Purpose:
  Diagnose exactly why a Product is or isn't matching an ADO Repo/Pipeline.
    `);
    process.exit(0);
}

// --- CONFIG ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));
    if (existsSync(localConfig)) return JSON.parse(readFileSync(localConfig, 'utf8'));
    console.error("❌ config.json not found.");
    process.exit(1);
}

const config = loadConfig();
const devopsConfig = config.devops;

if (!devopsConfig || !devopsConfig.pat) {
    console.error("❌ 'devops' section missing or incomplete in config.json");
    process.exit(1);
}

// --- MAIN ---
async function runDebug() {
    console.log(`\n🕵️‍♀️ DEBUG: Tracing Git Logic (Content Search) for Product: "${productNameArg}"`);
    console.log(`   Organization: ${devopsConfig.organization}`);
    console.log(`   Base URL:     ${devopsConfig.baseUrl || 'https://dev.azure.com'}`);

    // 1. Content Search
    console.log(`\n➡️  Step 1: Searching Code for "${productNameArg}"...`);
    let matchedRepo = null;
    let repoUrl = '';

    const strategies = [
        { name: "Phrase Search (+ .tf filters)", filters: { Extension: ["tf", "tfvars"] } },
        { name: "Global Search (No filters)", filters: {} }
    ];

    for (const strategy of strategies) {
        console.log(`\n   🔍 Trying strategy: ${strategy.name}`);
        console.log(`      Filters: ${JSON.stringify(strategy.filters)}`);
        try {
            const searchResp = await AzureService.searchCode(
                devopsConfig.organization,
                productNameArg!,
                devopsConfig.pat,
                devopsConfig.baseUrl,
                strategy.filters
            );

            console.log(`      Hits found: ${searchResp.count}`);

            if (searchResp.count > 0) {
                // Group by Repository
                const repoMap = new Map<string, any>();
                searchResp.results.forEach(r => {
                    if (!repoMap.has(r.repository.name)) {
                        repoMap.set(r.repository.name, {
                            id: r.repository.id,
                            name: r.repository.name,
                            project: r.repository.project.name,
                            files: []
                        });
                    }
                    repoMap.get(r.repository.name).files.push(`${r.path} (${r.fileName})`);
                });

                const uniqueRepos = Array.from(repoMap.values());
                console.log(`      Found matches in ${uniqueRepos.length} unique repositories:`);
                uniqueRepos.forEach(r => {
                    console.log(`        - [${r.name}] (Project: ${r.project})`);
                    r.files.slice(0, 3).forEach((f: string) => console.log(`            File: ${f}`));
                });

                // Filter out "GRP" repos
                const filteredRepos = uniqueRepos.filter(r => !r.name.toLowerCase().includes('grp'));

                if (filteredRepos.length > 0) {
                    if (filteredRepos.length > 1) {
                        console.warn(`      ⚠️  AMBIGUITY: Multiple repos found after filtering.`);
                    }
                    matchedRepo = filteredRepos[0];
                    console.log(`      🎯 MATCHED! -> ${matchedRepo.name}`);
                    break; // Exit strategies loop
                } else {
                    console.warn(`      ⚠️  Matches found but all filtered (likely GRP repos).`);
                }
            } else {
                console.log(`      No results for this strategy.`);
            }

        } catch (e) {
            console.error(`      ❌ Strategy failed with error.`, e);
        }
    }

    if (!matchedRepo) {
        console.error("\n⛔ STOP: No Repository matched. Logic ends here.");
        console.log("   Check: Does the product name exactly match what's in the .tf file?");
        console.log("   Check: Does your PAT have 'Code (Read & Search)' scope?");
        return;
    }

    // 2. Fetch Pipelines
    console.log(`\n➡️  Step 2: Fetching Pipelines for Repo: ${matchedRepo.name} (ID: ${matchedRepo.id})`);
    const pipelines = await AzureService.fetchADOPipelines(
        devopsConfig.organization,
        matchedRepo.project,
        matchedRepo.id,
        devopsConfig.pat,
        devopsConfig.baseUrl
    );

    console.log(`   Found ${pipelines.length} Pipelines.`);
    pipelines.forEach(p => console.log(`     - [${p.id}] ${p.name}`));

    if (pipelines.length === 0) {
        console.error(`   ⚠️ Repo has 0 pipelines linked.`);
        return;
    }

    // 3. Determine "Best" Pipeline
    const bestPipeline = pipelines.find(p => p.name.includes(matchedRepo.name) || p.name.toLowerCase().includes('ci')) || pipelines[0];
    console.log(`\n➡️  Step 3: Selecting Pipeline -> "${bestPipeline.name}"`);

    // 4. Fetch Runs
    console.log(`   Fetching Runs...`);
    const runs = await AzureService.fetchPipelineRuns(
        devopsConfig.organization,
        matchedRepo.project,
        bestPipeline.id,
        devopsConfig.pat,
        devopsConfig.baseUrl
    );

    if (runs.length > 0) {
        const latest = runs[0];
        console.log(`\n✅ SUCCESS! Metadata:`);
        console.log(`   Hash: ${'sourceVersion' in latest ? (latest as any).sourceVersion : 'N/A'}`);
        console.log(`   Date: ${latest.finishedDate || latest.createdDate}`);
        console.log(`   URL:  ${(latest as any).web?.href || (latest as any)._links?.web?.href}`);
    } else {
        console.log(`   ⚠️ Pipeline has 0 runs.`);
    }
}

runDebug();
