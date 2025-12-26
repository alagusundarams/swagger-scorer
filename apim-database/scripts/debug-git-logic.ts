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
    console.log(`\n🕵️‍♀️ DEBUG: Validated Host Payload Probe`);

    const pat = devopsConfig.pat;
    const cleanBaseUrl = (devopsConfig.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Auto-detect Org from URL
    let detectedOrg = devopsConfig.organization;
    if (cleanBaseUrl.includes('visualstudio.com')) {
        const match = cleanBaseUrl.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
        if (match) detectedOrg = match[1];
    }
    console.log(`   Organization: ${detectedOrg}`);

    // Discovery Step: Fetch Projects (Needed for Scoped Search tests)
    let projects: any[] = [];
    try {
        projects = await AzureService.fetchADOProjects(detectedOrg, pat, cleanBaseUrl);
        console.log(`   ✅ Connected! Found ${projects.length} projects.`);
    } catch (e: any) {
        console.log(`   ⚠️ Project discovery skipped.`);
    }

    // THE MAGIC HOST (Last run gave 400 Bad Request here, meaning host is ALIVE)
    const validHostUrl = `https://almsearch.dev.azure.com/${detectedOrg}/_apis/search/codesearchresults?api-version=7.1-preview.1`;

    console.log(`\n➡️  Step 1: Probing Payload Variations on Validated Host...`);
    console.log(`   Target URL: ${validHostUrl}`);

    const payloadStrategies = [
        {
            name: "1. Minimalist (No filters object)",
            body: {
                searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
                $top: 10
            }
        },
        {
            name: "2. Search Qualifier (using ext:tf)",
            body: {
                searchText: `${productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg} ext:tf ext:tfvars`,
                $top: 10
            }
        },
        {
            name: "3. Project Filter (Using discovered project)",
            body: {
                searchText: productNameArg!.includes(' ') ? `"${productNameArg}"` : productNameArg,
                $top: 10,
                filters: projects.length > 0 ? { Project: [projects[0].name] } : {}
            }
        }
    ];

    for (const strategy of payloadStrategies) {
        if (strategy.name.includes("Project") && projects.length === 0) continue;

        console.log(`\n   📡 Testing Palette: ${strategy.name}`);
        console.log(`      Body: ${JSON.stringify(strategy.body)}`);

        try {
            const response = await fetch(validHostUrl, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(strategy.body)
            });

            console.log(`      Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const searchResp = await response.json() as any;
                console.log(`      Hits found: ${searchResp.count}`);

                if (searchResp.count > 0) {
                    console.log(`      🎯 SUCCESS! Found results.`);
                    const first = searchResp.results[0];
                    console.log(`      Found in: ${first.path} (Repo: ${first.repository.name})`);
                    break;
                }
            } else {
                const txt = await response.text();
                console.log(`      ❌ Response: ${txt.substring(0, 200)}...`);
            }

        } catch (e: any) {
            console.error(`      ❌ Network error: ${e.message}`);
        }
    }

    console.log(`\n🏁 Probe complete.`);
}

runDebug();
