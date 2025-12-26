/**
 * @fileoverview PART 2: ADO METADATA EXTRACTION
 * 
 * PURPOSE:
 * Consumes the product inventory from Part 1 and performs targeted ADO discovery.
 * Links products to Pipeline IDs and surgically recovers the latest successful hashes
 * for DEV, QA, STAGE, and PROD.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

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

interface ADOMetadata {
    productId: string;
    productName: string;
    repository?: { id: string; name: string; project: string; projectId: string };
    pipeline?: { id: number; name: string };
    deployments: Record<string, { hash: string; date: string }>;
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

async function main() {
    console.log(`🚀 [PART 2] Starting ADO Metadata Extraction...\n`);

    const devops = config.devops;
    if (!devops) {
        console.error("❌ DevOps configuration missing in config.json");
        process.exit(1);
    }

    // 1. Load Inventory
    const inventoryPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'apim-inventory.json');
    if (!existsSync(inventoryPath)) {
        console.error(`❌ Inventory file not found: ${inventoryPath}. Run Part 1 first!`);
        process.exit(1);
    }
    const inventory: ProductIdentity[] = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    console.log(`📊 Loaded ${inventory.length} unique products for discovery.`);

    // 2. Setup Auth (CLI Fallback)
    let cliToken = "";
    try {
        console.log(`🔎 [AUTH] Checking for Azure CLI Access Token (499b84ee-1328-4417-95a1-8288018c668b)...`);
        cliToken = await AzureService.getAzureAccessToken("499b84ee-1328-4417-95a1-8288018c668b");
        if (cliToken) console.log(`   ✅ CLI Token obtained for broad discovery.`);
    } catch (e) {
        console.warn(`   ⚠️  CLI Token unavailable. Falling back to PAT.`);
    }

    // 3. Discovery Loop
    const results: ADOMetadata[] = [];
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const prod of inventory) {
        console.log(`\n🔹 Processing: ${prod.name} (${prod.id})`);
        const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };

        try {
            // A. Repository Search (Exhaustive & Ranked)
            const cleanProd = sanitize(prod.name);
            const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
            const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
            const searchResp = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl, cliToken);

            if (!searchResp || searchResp.count === 0) {
                console.log(`   ⚠️  REPO_MISSING: No TF matches for "${prod.name}"`);
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            // --- RANKING LOGIC ---
            const repoCandidates = searchResp.results.map(r => {
                const rName = r.repository.name;
                const cleanRepo = sanitize(rName);
                let score = 0;

                if (cleanRepo === cleanProd) score += 100; // Perfect match
                else if (cleanRepo.includes(cleanProd)) score += 50; // Name included

                if (cleanRepo.includes('grp')) score -= 20;
                if (cleanRepo.includes('shared') || cleanRepo.includes('common')) score -= 30;

                return { repo: r.repository, score, name: rName };
            }).sort((a, b) => b.score - a.score);

            const repo = repoCandidates[0].repo;
            const repoScore = repoCandidates[0].score;

            if (repoScore < 30) {
                console.log(`   ⚠️  LOW_CONFIDENCE_REPO: Nearest match "${repo.name}" has score ${repoScore}.`);
            }

            meta.repository = { id: repo.id, name: repo.name, project: repo.project.name, projectId: repo.project.id };
            console.log(`   ✅ Repo: ${repo.name} (Score: ${repoScore})`);

            // B. Pipeline Discovery & Ranking
            const pipelines = await AzureService.fetchADOPipelines(devops.organization, repo.project.id || repo.project.name, repo.id, devops.pat, devops.baseUrl, cliToken);

            if (pipelines.length === 0) {
                console.log(`   ⚠️  PIPELINE_MISSING: No pipelines in repo.`);
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            const pipeCandidates = pipelines.map(p => {
                const cleanPipe = sanitize(p.name);
                let score = 0;
                if (cleanPipe.includes(cleanProd)) score += 50;
                if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                if (cleanPipe.includes('apim')) score += 5;
                return { pipe: p, score, name: p.name };
            }).sort((a, b) => b.score - a.score);

            const matchedPipeline = pipeCandidates[0].pipe;
            const pipeScore = pipeCandidates[0].score;

            if (pipeScore < 10) {
                console.log(`   ⚠️  PIPELINE_MISSING: Only low-confidence matching pipelines found.`);
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            meta.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
            meta.status = 'MATCHED';
            console.log(`   ✅ Pipeline: ${matchedPipeline.name} (Score: ${pipeScore})`);

            // C. Surgical Hash Sync
            const envsToSync = ['DEV', 'QA', 'STAGE', 'PROD'];
            const projectIdent = repo.project.id || repo.project.name;
            const runs = await AzureService.fetchPipelineRuns(devops.organization, projectIdent, matchedPipeline.id, devops.pat, devops.baseUrl, cliToken);

            const timelineCache = new Map<number, any[]>();

            for (const envName of envsToSync) {
                let found = false;
                for (const run of runs.slice(0, 50)) {
                    if (found) break;

                    if (!timelineCache.has(run.id)) {
                        timelineCache.set(run.id, await AzureService.fetchPipelineRunTimeline(devops.organization, projectIdent, run.id, devops.pat, devops.baseUrl, cliToken));
                    }
                    const timeline = timelineCache.get(run.id)!;
                    const stage = timeline.find(t => t.type === 'stage' && sanitize(t.name).includes(sanitize(envName)) && t.result === 'succeeded');

                    if (stage) {
                        meta.deployments[envName] = {
                            hash: (run as any).sourceVersion || 'unknown',
                            date: stage.finishTime || run.finishedDate
                        };
                        found = true;
                    }
                }
                if (found) {
                    console.log(`      📍 ${envName}: ${meta.deployments[envName].hash.substring(0, 7)}`);
                }
            }

            results.push(meta);

        } catch (e: any) {
            console.error(`   ❌ Error: ${e.message}`);
            results.push(meta);
        }
    }

    // 4. Save Metadata
    const outputPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'ado-metadata.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\n✅ ADO Metadata Extraction Complete!`);
    console.log(`📊 Matched ${results.filter(r => r.status === 'MATCHED').length} / ${inventory.length} products.`);
    console.log(`💾 Saved to: ${outputPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
