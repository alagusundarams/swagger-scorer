import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from './services/AzureService.js';

// --- ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];

if (help || !productNameArg) {
    console.log(`
Usage: 
  npx tsx scripts/debug-git-logic.ts --product="My Product Name"

Purpose:
  Probe legacy ADO Search endpoints by testing multiple path/collection variations.
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
    console.log(`\n🕵️‍♀️ DEBUG: Legacy Search URL Probe`);
    console.log(`   Organization: ${devopsConfig.organization}`);
    console.log(`   Base URL:     ${devopsConfig.baseUrl || 'https://dev.azure.com'}`);

    const org = devopsConfig.organization;
    const pat = devopsConfig.pat;
    const cleanBaseUrl = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Discovery Step: Fetch Projects to enable scoped tests
    console.log(`\n➡️  Step 0: Discovery (Fetching Projects)...`);
    let projects: any[] = [];
    try {
        projects = await AzureService.fetchADOProjects(org, pat, cleanBaseUrl);
        console.log(`   ✅ Found ${projects.length} projects.`);
    } catch (e: any) {
        console.warn(`   ⚠️  Discovery failed, continuing with global probes only.`);
    }

    // 1. Content Search Probing
    console.log(`\n➡️  Step 1: Probing Search Endpoints for "${productNameArg}"...`);

    const searchBody = {
        searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
        $top: 20,
        filters: { Extension: ["tf", "tfvars"] }
    };

    // Endpoints to test - focusing on Legacy visualstudio.com patterns
    const endpoints = [
        {
            name: "Modern Standard Host",
            url: `https://almsearch.dev.azure.com/${org}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        },
        {
            name: "Legacy Direct (No doubled org)",
            url: `${cleanBaseUrl}/_apis/search/codesearchresults?api-version=5.1`
        },
        {
            name: "Legacy with Collection Path",
            url: `${cleanBaseUrl}/DefaultCollection/_apis/search/codesearchresults?api-version=5.1`
        },
        {
            name: "Legacy with Collection Path (API 7.1)",
            url: `${cleanBaseUrl}/DefaultCollection/_apis/search/codesearchresults?api-version=7.1-preview.1`
        }
    ];

    // Add specific project-scoped probe if possible
    if (projects.length > 0) {
        const testProj = projects[0].name;
        endpoints.push({
            name: `Project-Scoped (Project: ${testProj})`,
            url: `${cleanBaseUrl}/${testProj}/_apis/search/codesearchresults?api-version=5.1`
        });
    }

    for (const ep of endpoints) {
        console.log(`\n   📡 Testing: ${ep.name}`);
        console.log(`      URL: ${ep.url}`);

        try {
            const response = await fetch(ep.url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(searchBody)
            });

            console.log(`      Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const searchResp = await response.json() as any;
                console.log(`      Hits found: ${searchResp.count}`);

                if (searchResp.count > 0) {
                    console.log(`      🎯 SUCCESS! Found results.`);
                    const first = searchResp.results[0];
                    console.log(`      Example: ${first.path} in Repo [${first.repository.name}]`);
                    break;
                }
            } else {
                const txt = await response.text();
                console.log(`      ❌ Error Details: ${txt.substring(0, 150)}...`);
            }

        } catch (e: any) {
            console.error(`      ❌ Network error: ${e.message}`);
        }
    }

    console.log(`\n🏁 Probe complete.`);
}

runDebug();
