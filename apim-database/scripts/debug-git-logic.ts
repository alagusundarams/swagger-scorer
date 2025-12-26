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
    // --- PIPELINE DISCOVERY LOOP ---
    console.log(`\n➡️  Step 2: Starting Exhaustive Pipeline Discovery (with CLI Token fallback)...`);
    let pipelines: any[] = [];

    // Attempt CLI token recovery for permission override
    console.log(`   🔎 Checking for Azure CLI Access Token...`);
    let cliToken = "";
    try {
        // Resource ID for Azure DevOps: 499b84ee-1328-4417-95a1-8288018c668b
        cliToken = await AzureService.getAzureAccessToken("499b84ee-1328-4417-95a1-8288018c668b");
        if (cliToken) console.log(`      ✅ CLI Token obtained (bypassing PAT restrictions)`);
    } catch (e) {
        console.log(`      ℹ️  CLI Token unavailable. Continuing with PAT.`);
    }

    const runDiscovery = async (tokenOverride?: string) => {
        const label = tokenOverride ? "CLI Token" : "PAT";
        console.log(`\n   --- Trying Discovery via ${label} ---`);

        const tryBase = async (base: string, label: string) => {
            console.log(`\n      [${label}] Testing Base URL: ${base}`);

            // Strategy: Modern Pipelines API
            console.log(`      [Pipelines API] repoId=${primaryRepoId}, type=azureRepo...`);
            let results = await AzureService.fetchADOPipelines(devops.organization, projectIdentifier, primaryRepoId, devops.pat, base, tokenOverride);

            // Strategy: Legacy Build API
            if (results.length === 0) {
                console.log(`      [Build API] repoId=${primaryRepoId}, type=TfsGit...`);
                results = await AzureService.fetchADOBuildDefinitions(devops.organization, projectIdentifier, primaryRepoId, devops.pat, base, tokenOverride);
            }

            // Strategy: Recent Builds
            if (results.length === 0) {
                console.log(`      [Recent Builds] Checking history...`);
                const recentBuilds = await AzureService.fetchADOBuilds(devops.organization, projectIdentifier, primaryRepoId, devops.pat, base, tokenOverride);
                if (recentBuilds.length > 0) {
                    results = recentBuilds.map(b => ({
                        id: b.definition.id,
                        name: b.definition.name,
                        folder: b.definition.path || "",
                        url: b.definition.url || "",
                        _links: b.definition._links || { web: { href: "" } }
                    }));
                }
            }
            return results;
        };

        let results = await tryBase(devops.baseUrl, "Standard");

        // Try DefaultCollection fallback for legacy orgs
        if (results.length === 0 && devops.baseUrl.includes("visualstudio.com")) {
            const collectionBase = devops.baseUrl.replace(/\/?$/, "") + "/DefaultCollection";
            results = await tryBase(collectionBase, "Legacy DefaultCollection");
        }

        return results;
    };

    // First try with PAT, then try with CLI token if PAT failed and token exists
    pipelines = await runDiscovery();
    if (pipelines.length === 0 && cliToken) {
        pipelines = await runDiscovery(cliToken);
    }

    console.log(`\n📊 Discovery Summary: Found ${pipelines.length} possible pipeline matches.`);

    if (pipelines.length === 0) {
        console.log(`   ❌ FATAL: All discovery strategies returned zero results.`);
        console.log(`      Possible reasons: 1) PAT lacks Build/Pipeline Read permissions. 2) Incorrect ProjectID/URL.`);
        return;
    }

    // --- PIPELINE MATCHING ---
    console.log(`\n➡️  Step 3: Matching Pipeline...`);

    const matchedPipeline = pipelines.find(p =>
        p.name.toLowerCase().includes(productNameArg!.toLowerCase()) ||
        productNameArg!.toLowerCase().includes(p.name.toLowerCase())
    );

    if (!matchedPipeline) {
        console.log(`\n   ⚠️  No direct name match found. Candidates:`);
        pipelines.slice(0, 10).forEach(p => console.log(`      - [ID: ${p.id}] ${p.name}`));
        return;
    }

    console.log(`\n🎉 MATCH FOUND:`);
    console.log(`   Product:   ${productNameArg}`);
    console.log(`   Repo:      ${primaryRepoName} (ID: ${primaryRepoId})`);
    console.log(`   Project:   ${project} (ID: ${projectId})`);
    console.log(`   Pipeline:  ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);

    console.log(`\n✅ Database Seeding Data:`);
    const seedData = {
        product: productNameArg,
        organization: devops.organization,
        project: project,
        projectId: projectId,
        repositoryId: primaryRepoId,
        pipelineId: matchedPipeline.id,
        pipelineName: matchedPipeline.name
    };
    console.log(JSON.stringify(seedData, null, 2));

    console.log(`\n💡 Skipping deep deployment crawl to preserve rate limits.`);
}

runDebug().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
