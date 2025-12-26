import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from './services/AzureService.js';
import fetch from 'node-fetch';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];

if (help || !productNameArg) {
    console.log(`
Usage: 
  npx tsx scripts/debug-git-logic.ts --product="My Product Name"

Purpose:
  Probe multiple ADO Search endpoints to find the correct one for legacy accounts.
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

    // 1. Content Search Probing
    console.log(`\n➡️  Step 1: Probing Search Endpoints for "${productNameArg}"...`);
    let matchedRepo = null;

    const org = devopsConfig.organization;
    const cleanBaseUrl = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');

    // Endpoints to test
    const endpoints = [
        {
            name: "Modern Search Host (Recommended)",
            url: `https://almsearch.dev.azure.com/${org}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        },
        {
            name: "Legacy Base URL (Direct)",
            url: `${cleanBaseUrl}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        },
        {
            name: "Legacy Base URL + Org Path (Doubled)",
            url: `${cleanBaseUrl}/${org}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        }
    ];

    const authHeader = `Basic ${Buffer.from(`:${devopsConfig.pat}`).toString('base64')}`;

    for (const ep of endpoints) {
        console.log(`\n   📡 Testing: ${ep.name}`);
        console.log(`      URL: ${ep.url}`);

        try {
            const body = {
                searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
                $top: 20,
                filters: { Extension: ["tf", "tfvars"] }
            };

            const response = await fetch(ep.url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            console.log(`      Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const searchResp = await response.json() as any;
                console.log(`      Hits found: ${searchResp.count}`);

                if (searchResp.count > 0) {
                    const repoMap = new Map<string, any>();
                    searchResp.results.forEach((r: any) => {
                        if (!repoMap.has(r.repository.name)) {
                            repoMap.set(r.repository.name, {
                                id: r.repository.id,
                                name: r.repository.name,
                                project: r.repository.project.name
                            });
                        }
                    });

                    const uniqueRepos = Array.from(repoMap.values());
                    const filtered = uniqueRepos.filter(r => !r.name.toLowerCase().includes('grp'));

                    if (filtered.length > 0) {
                        matchedRepo = filtered[0];
                        console.log(`      🎯 SUCCESS! Matched Repo: ${matchedRepo.name} via ${ep.name}`);
                        break;
                    }
                }
            } else if (response.status === 404) {
                console.log(`      ⚠️  Not Found (404). This endpoint is likely incorrect for this account.`);
            } else {
                const txt = await response.text();
                console.log(`      ❌ Error Details: ${txt.substring(0, 100)}...`);
            }

        } catch (e: any) {
            console.error(`      ❌ Network error: ${e.message}`);
        }
    }

    if (!matchedRepo) {
        console.error("\n⛔ STOP: All search probes failed or returned 0 results.");
        console.log("   Suggestion: Verify your PAT has 'Code (Read & Search)' permissions.");
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
    if (pipelines.length === 0) return;

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
