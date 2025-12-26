/**
 * @fileoverview MASTER UNIFIED DISCOVERY SCRIPT: Inventory -> Discovery -> Sync
 * 
 * PURPOSE:
 * 1. [INVENTORY] Aggregate unique Products from all APIM environments.
 * 2. [DISCOVERY] Link Products to Azure DevOps Pipelines using sanitized matching.
 * 3. [SYNC] surgical fetch of per-environment (DEV/QA/STAGE/PROD) hashes.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AzureService } from './services/AzureService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIG LOADER ---
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();

interface ProductIdentity {
    id: string;
    name: string;
    environments: string[];
}

interface DiscoveryResult {
    product: ProductIdentity;
    repository?: { id: string; name: string; project: string; projectId: string };
    pipeline?: { id: number; name: string };
    deployments: Record<string, { hash: string; date: string }>;
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

async function main() {
    console.log(`🚀 [UNIFIED DISCOVERY] Starting 3-Part Modular Process...\n`);

    const devops = config.devops;
    if (!devops) {
        console.error("❌ DevOps configuraton missing in config.json");
        process.exit(1);
    }

    // Attempt CLI token recovery for broad read access
    let cliToken = "";
    try {
        console.log(`🔎 [AUTH] Checking for Azure CLI Access Token (499b84ee-1328-4417-95a1-8288018c668b)...`);
        cliToken = await AzureService.getAzureAccessToken("499b84ee-1328-4417-95a1-8288018c668b");
        if (cliToken) console.log(`   ✅ CLI Token obtained for broad discovery.`);
    } catch (e) {
        console.warn(`   ⚠️  CLI Token unavailable. Falling back to PAT.`);
    }

    const azureToken = await AzureService.getAzureAccessToken();

    // --- PART 1: INVENTORY GATHERING ---
    console.log(`\n📦 PART 1: Inventory Gathering (Scanning APIM Environments)...`);
    const uniqueProducts = new Map<string, ProductIdentity>();
    const envConfigs = config.azure?.environments || [];

    for (const env of envConfigs) {
        try {
            console.log(`   🔸 Scanning ${env.name} (${env.instance})...`);
            const azConfig = {
                subscriptionId: env.subscriptionId,
                resourceGroup: env.resourceGroup,
                serviceName: env.instance,
                environment: env.name
            };

            const apimConfig = {
                instance: azConfig.serviceName,
                resourceGroup: azConfig.resourceGroup,
                subscriptionId: azConfig.subscriptionId,
                accessToken: azureToken,
                environment: azConfig.environment
            };

            const response = await AzureService.fetchAPIM<any>(apimConfig, '/products');
            const products = response.value || [];

            for (const p of products) {
                const prodId = p.name;
                const prodName = p.properties.displayName;

                if (!uniqueProducts.has(prodId)) {
                    uniqueProducts.set(prodId, { id: prodId, name: prodName, environments: [env.name] });
                } else {
                    uniqueProducts.get(prodId)!.environments.push(env.name);
                }
            }
        } catch (e: any) {
            console.error(`   ❌ Failed to scan ${env.name}:`, e.message);
        }
    }

    console.log(`✅ Inventory Complete: Found ${uniqueProducts.size} unique products across ${envConfigs.length} environments.`);

    // --- PART 2 & 3: DISCOVERY & SYNC ---
    console.log(`\n🔍 PART 2 & 3: Discovery & Surgical Sync...`);
    const finalResults: DiscoveryResult[] = [];

    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const prod of uniqueProducts.values()) {
        console.log(`\n🔹 Processing Product: ${prod.name} (${prod.id})`);
        const result: DiscoveryResult = { product: prod, deployments: {}, status: 'ORPHAN' };

        try {
            // A. Repository Search
            const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
            const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
            const searchResp = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl, cliToken);

            if (!searchResp || searchResp.count === 0) {
                console.log(`   ⚠️  REPO_MISSING: No terraform matching "${prod.name}" found in Git.`);
                result.status = 'REPO_MISSING';
                finalResults.push(result);
                continue;
            }

            // Pick the best repo (exclude GRP/Shared)
            const repoMap = new Map<string, any>();
            searchResp.results.forEach((r: any) => {
                if (!repoMap.has(r.repository.name) && !r.repository.name.toLowerCase().includes('grp')) {
                    repoMap.set(r.repository.name, {
                        id: r.repository.id,
                        name: r.repository.name,
                        project: r.repository.project.name,
                        projectId: r.repository.project.id
                    });
                }
            });

            const candidateRepos = Array.from(repoMap.values());
            if (candidateRepos.length === 0) {
                result.status = 'REPO_MISSING';
                finalResults.push(result);
                continue;
            }

            const matchedRepo = candidateRepos[0]; // Take primary match
            result.repository = matchedRepo;
            console.log(`   ✅ Repo Found: ${matchedRepo.name} (${matchedRepo.project})`);

            // B. Pipeline Discovery
            const pipelines = await AzureService.fetchADOPipelines(devops.organization, matchedRepo.projectId || matchedRepo.project, matchedRepo.id, devops.pat, devops.baseUrl, cliToken);

            const cleanProduct = sanitize(prod.name);
            const matchedPipeline = pipelines.find(p => {
                const cleanPipe = sanitize(p.name);
                return cleanPipe.includes(cleanProduct) || cleanProduct.includes(cleanPipe);
            });

            if (!matchedPipeline) {
                console.log(`   ⚠️  PIPELINE_MISSING: No matching pipeline for "${prod.name}" in project ${matchedRepo.project}.`);
                result.status = 'PIPELINE_MISSING';
                finalResults.push(result);
                continue;
            }

            result.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
            result.status = 'MATCHED';
            console.log(`   ✅ Pipeline Matched: ${matchedPipeline.name} (ID: ${matchedPipeline.id})`);

            // C. Surgical Sync (Per Environment Hash)
            const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
            console.log(`   ⏳ Syncing Environment Hashes...`);

            const projectIdent = matchedRepo.projectId || matchedRepo.project;
            const runs = await AzureService.fetchPipelineRuns(devops.organization, projectIdent, matchedPipeline.id, devops.pat, devops.baseUrl, cliToken);

            // Optimization: Pull Top 100 runs to find history for all envs
            const timelineCache = new Map<number, any[]>();

            for (const envName of envsToSync) {
                let found = false;
                for (const run of runs.slice(0, 100)) {
                    if (found) break;

                    // Fetch timeline if not cached
                    if (!timelineCache.has(run.id)) {
                        timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdent, run.id, devops.pat, devops.baseUrl, cliToken));
                    }
                    const timeline = timelineCache.get(run.id)!;

                    // Look for successful stage match
                    const stage = timeline.find(t =>
                        t.type === 'stage' &&
                        sanitize(t.name).includes(sanitize(envName)) &&
                        t.result === 'succeeded'
                    );

                    if (stage) {
                        result.deployments[envName] = {
                            hash: (run as any).sourceVersion || 'unknown',
                            date: stage.finishTime || run.finishedDate
                        };
                        console.log(`      📍 ${envName}: ${result.deployments[envName].hash.substring(0, 7)} (${result.deployments[envName].date})`);
                        found = true;
                    }
                }
                if (!found) console.log(`      📍 ${envName}: No successful deployment found in last 100 runs.`);
            }

            finalResults.push(result);

        } catch (e: any) {
            console.error(`   ❌ Error processing ${prod.name}:`, e.message);
            finalResults.push(result);
        }
    }

    // --- FINAL REPORT ---
    console.log(`\n🏁 [UNIFIED DISCOVERY] Process Complete.`);
    const summary = {
        total: finalResults.length,
        matched: finalResults.filter(r => r.status === 'MATCHED').length,
        repoMissing: finalResults.filter(r => r.status === 'REPO_MISSING').length,
        pipelineMissing: finalResults.filter(r => r.status === 'PIPELINE_MISSING').length,
    };

    console.log(`📊 Summary:`, summary);

    // Save results to report file
    const reportPath = join(__dirname, 'discovery-report.json');
    writeFileSync(reportPath, JSON.stringify(finalResults, null, 2));
    console.log(`💾 Full report saved to: ${reportPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
