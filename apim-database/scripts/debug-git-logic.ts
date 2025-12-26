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
    console.log(`\n🕵️‍♀️ DEBUG: Ultimate Connectivity & Search Probe`);

    const rawOrg = devopsConfig.organization;
    const pat = devopsConfig.pat;
    const cleanBaseUrl = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // 0. Auto-detect Org from URL if legacy
    let detectedOrg = rawOrg;
    if (cleanBaseUrl.includes('visualstudio.com')) {
        const match = cleanBaseUrl.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
        if (match) {
            detectedOrg = match[1];
            console.log(`   💡 Detected Organization from URL: ${detectedOrg}`);
        }
    }
    console.log(`   Configured Org: ${rawOrg}`);
    console.log(`   Base URL:       ${cleanBaseUrl}`);

    // 1. Fetch Projects (Discovery)
    console.log(`\n➡️  Step 1: Discovery (Fetching Projects)...`);
    let projects: any[] = [];
    try {
        projects = await AzureService.fetchADOProjects(detectedOrg, pat, cleanBaseUrl);
        console.log(`   ✅ Success! Found ${projects.length} projects.`);
    } catch (e: any) {
        console.warn(`   ⚠️  Discovery failed (Expected on some legacy restricted accounts).`);
    }

    // 2. Search Probing
    console.log(`\n➡️  Step 2: Probing Search Endpoints for "${productNameArg}"...`);

    // We will test both the "Configured Org" and "Detected Org"
    const orgsToTest = Array.from(new Set([rawOrg, detectedOrg]));
    const body = {
        searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
        $top: 10,
        filters: { Extension: ["tf", "tfvars"] }
    };

    const searchVariations: any[] = [];

    for (const testOrg of orgsToTest) {
        // A. Modern Host (Best for REST APIs)
        searchVariations.push({
            name: `Modern Host (Org: ${testOrg})`,
            url: `https://almsearch.dev.azure.com/${testOrg}/_apis/search/codesearchresults?api-version=7.1-preview.1`
        });

        // B. Legacy Direct
        searchVariations.push({
            name: `Legacy Direct (Org: ${testOrg})`,
            url: `${cleanBaseUrl}/_apis/search/codesearchresults?api-version=5.1`
        });

        // C. Legacy with DefaultCollection
        searchVariations.push({
            name: `Legacy with Collection (Org: ${testOrg})`,
            url: `${cleanBaseUrl}/DefaultCollection/_apis/search/codesearchresults?api-version=5.1`
        });

        // D. Project Scoped (if possible)
        if (projects.length > 0) {
            const project = projects[0].name;
            searchVariations.push({
                name: `Project Scoped (Project: ${project})`,
                url: `${cleanBaseUrl}/${project}/_apis/search/codesearchresults?api-version=5.1`
            });
        }
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
                body: JSON.stringify(body)
            });

            console.log(`      Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const searchResp = await response.json() as any;
                console.log(`      Hits: ${searchResp.count}`);
                if (searchResp.count > 0) {
                    console.log(`      🎯 SUCCESS! Found repo: ${searchResp.results[0].repository.name}`);
                    break;
                }
            } else {
                const txt = await response.text();
                console.log(`      ❌ Message: ${txt.substring(0, 150)}...`);
            }

        } catch (e: any) {
            console.error(`      ❌ Network Error: ${e.message}`);
        }
    }

    console.log(`\n🏁 Probe complete.`);
}

runDebug();
