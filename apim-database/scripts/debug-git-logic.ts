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
    console.log(`\n🕵️‍♀️ DEBUG: Tracing Git Logic for Product: "${productNameArg}"`);
    console.log(`   Organization: ${devopsConfig.organization}`);
    console.log(`   Base URL:     ${devopsConfig.baseUrl || 'https://dev.azure.com'}`);

    // 1. Fetch All Repos
    console.log(`\n➡️  Step 1: Fetching ALL Repos from Org...`);
    let repos: any[] = [];
    try {
        const projects = await AzureService.fetchADOProjects(devopsConfig.organization, devopsConfig.pat, devopsConfig.baseUrl);
        console.log(`   Found ${projects.length} Projects.`);

        repos = await AzureService.fetchADOReposAcrossProjects(devopsConfig.organization, projects, devopsConfig.pat, devopsConfig.baseUrl);
        console.log(`   ✅ Total Repos Discovered: ${repos.length}`);
    } catch (e) {
        console.error("   ❌ Failed to fetch repos. check PAT/Permissions.", e);
        process.exit(1);
    }

    // 2. Exact Match Logic
    console.log(`\n➡️  Step 2: Matching Product...`);
    let matchedRepo = null;

    // A. Tag Match
    if (explicitTagArg) {
        // Mocking the tag lookup logic
        const tagName = explicitTagArg.replace('repo:', '');
        console.log(`   [Check] Provided Tag: "repo:${tagName}"`);
        matchedRepo = repos.find(r => r.name.toLowerCase() === tagName.toLowerCase());
        if (matchedRepo) console.log(`   🎯 MATCHED via TAG! -> ${matchedRepo.name} (ID: ${matchedRepo.id})`);
        else console.log(`   ⚠️ Tag provided but NO repo matches name "${tagName}".`);
    } else {
        console.log(`   [Check] No --tag arg provided. Skipping tag lookup.`);
    }

    // B. Name Match
    if (!matchedRepo) {
        console.log(`   [Check] Fuzzy Name Match against "${productNameArg}"...`);
        // Debug candidates
        const candidates = repos.filter(r => r.name.toLowerCase().includes(productNameArg!.toLowerCase()) || productNameArg!.toLowerCase().includes(r.name.toLowerCase()));
        if (candidates.length > 0) {
            console.log(`   ℹ️  Potential partial matches found: ${candidates.map(c => c.name).join(', ')}`);
        }

        matchedRepo = repos.find(r => r.name.toLowerCase() === productNameArg!.toLowerCase());
        if (matchedRepo) console.log(`   🎯 MATCHED via NAME! -> ${matchedRepo.name} (ID: ${matchedRepo.id})`);
        else console.log(`   ❌ No Exact Name Match found.`);
    }

    if (!matchedRepo) {
        console.error("\n⛔ STOP: No Repository matched. Logic ends here.");
        console.log("   Suggestion: Verify the Product Name matches the Repo matched exactly, or use a 'repo:<name>' tag.");
        return;
    }

    // 3. Fetch Pipelines
    console.log(`\n➡️  Step 3: Fetching Pipelines for Repo: ${matchedRepo.name}`);
    const pipelines = await AzureService.fetchADOPipelines(
        devopsConfig.organization,
        matchedRepo.project.name,
        matchedRepo.id,
        devopsConfig.pat,
        devopsConfig.baseUrl
    );

    console.log(`   Found ${pipelines.length} Pipelines linked to this repo.`);
    pipelines.forEach(p => console.log(`     - [${p.id}] ${p.name} (Folder: ${p.folder})`));

    if (pipelines.length === 0) {
        console.error(`   ⚠️ Repo has 0 pipelines. Cannot fetch build status.`);
        return;
    }

    // 4. Determine "Best" Pipeline
    const bestPipeline = pipelines.find(p => p.name.includes(matchedRepo.name) || p.name.toLowerCase().includes('ci')) || pipelines[0];
    console.log(`\n➡️  Step 4: Selecting Target Pipeline -> "${bestPipeline.name}" (ID: ${bestPipeline.id})`);

    // 5. Fetch Runs
    console.log(`   Fetching Runs...`);
    const runs = await AzureService.fetchPipelineRuns(
        devopsConfig.organization,
        matchedRepo.project.name,
        bestPipeline.id,
        devopsConfig.pat,
        devopsConfig.baseUrl
    );

    if (runs.length > 0) {
        const latest = runs[0];
        console.log(`\n✅ SUCCESS! Metadata that would be synced:`);
        console.log(`   Hash: ${'sourceVersion' in latest ? (latest as any).sourceVersion : 'N/A'}`);
        console.log(`   Date: ${latest.finishedDate || latest.createdDate}`);
        console.log(`   URL:  ${(latest as any).web?.href || (latest as any)._links?.web?.href}`);
    } else {
        console.log(`   ⚠️ Pipeline found but has 0 runs history.`);
    }
}

runDebug();
