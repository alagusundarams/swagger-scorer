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
  Probe multiple ADO Search endpoints using the correct REST API patterns.
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
    console.log(`\n🕵️‍♀️ DEBUG: Connectivity & Search Probe`);
    console.log(`   Organization: ${devopsConfig.organization}`);
    console.log(`   Base URL:     ${devopsConfig.baseUrl || 'https://dev.azure.com'}`);

    const org = devopsConfig.organization;
    const pat = devopsConfig.pat;
    const cleanBaseUrl = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // 0. Verify Connectivity & Discovery
    console.log(`\n➡️  Step 0: Verifying Connectivity (Fetching Projects)...`);
    let projectList: any[] = [];
    try {
        projectList = await AzureService.fetchADOProjects(org, pat, cleanBaseUrl);
        console.log(`   ✅ Connected! Found ${projectList.length} projects.`);
    } catch (e: any) {
        console.error(`   ❌ FAIL: Could not fetch projects. Your baseUrl/org/pat might be wrong.`);
        console.error(`      Error: ${e.message}`);
        return;
    }

    // 1. Content Search Probing
    console.log(`\n➡️  Step 1: Probing Search Endpoints for "${productNameArg}"...`);

    const searchBody = {
        searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
        $top: 10,
        filters: { Extension: ["tf", "tfvars"] }
    };

    // Refined Endpoints based on REST API standards for Legacy vs Modern
    const searchVariations = [
        {
            name: "Modern Search Host (Official Cloud Endpoint)",
            url: `https://almsearch.dev.azure.com/${org}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        },
        {
            name: "Legacy Subdomain (Direct path - No doubled org)",
            url: `${cleanBaseUrl}/_apis/search/codesearchresults?api-version=5.1`
        },
        {
            name: "Legacy with DefaultCollection (Common legacy pattern)",
            url: `${cleanBaseUrl}/DefaultCollection/_apis/search/codesearchresults?api-version=5.1`
        }
    ];

    // Add Project-scoped test if we have projects
    if (projectList.length > 0) {
        const testProj = projectList[0].name;
        searchVariations.push({
            name: `Project-Scoped Search (Testing Project: ${testProj})`,
            url: `${cleanBaseUrl}/${testProj}/_apis/search/codesearchresults?api-version=5.1`
        });
    }

    for (const ep of searchVariations) {
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
                    console.log(`      🎯 SUCCESS! Hits found.`);
                    const first = searchResp.results[0];
                    console.log(`      Sample Result: ${first.path} in [${first.repository.name}]`);
                    break;
                }
            } else {
                const txt = await response.text();
                console.log(`      ❌ Error: ${txt.substring(0, 150)}...`);
            }

        } catch (e: any) {
            console.error(`      ❌ Network error: ${e.message}`);
        }
    }

    console.log(`\n🏁 Probe complete.`);
}

runDebug();
