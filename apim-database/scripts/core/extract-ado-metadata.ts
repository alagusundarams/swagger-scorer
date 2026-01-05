/**
 * @fileoverview PART 2: ADO METADATA EXTRACTION
 * 
 * PURPOSE:
 * Consumes the product inventory from Part 1 or the existing DB
 * and performs targeted ADO discovery.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';
import pkg from 'pg';
const { Pool } = pkg;

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

// --- ARGS ---
const args = process.argv.slice(2);
const targetEnv = args.find(a => a.startsWith('--env='))?.split('=')[1]?.toUpperCase();
const sourceMode = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'inventory'; // 'inventory' or 'db'
const verbose = !args.includes('--quiet');
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

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
    discoveredSpecs?: string[];
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

async function main() {
    console.log(`🚀 [PART 2] Starting ADO Metadata Extraction (Source: ${sourceMode})...\n`);
    if (targetEnv) console.log(`🎯 Filtering for Environment: ${targetEnv}\n`);

    const devops = config.devops;
    if (!devops) {
        console.error("❌ DevOps configuration missing in config.json");
        process.exit(1);
    }

    let inventory: ProductIdentity[] = [];

    // 1. Load Discovery Source
    if (sourceMode === 'db') {
        console.log(`🔌 Fetching unique products from Database...`);
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || (config.database ? config.database.url : undefined),
            ...(typeof config.database === 'object' ? config.database : {})
        });
        try {
            const res = await pool.query(`
                SELECT id, name, array_agg(DISTINCT environment) as environments 
                FROM products 
                GROUP BY id, name
            `);
            inventory = res.rows.map(row => ({
                id: row.id,
                name: row.name,
                environments: row.environments
            }));
            console.log(`   ✅ Loaded ${inventory.length} logical products from DB.`);
        } catch (err: any) {
            console.error(`❌ DB Connection failed: ${err.message}`);
            process.exit(1);
        } finally {
            await pool.end();
        }
    } else {
        const inventoryDir = existsSync(join(process.cwd(), 'scripts', 'data'))
            ? join(process.cwd(), 'scripts', 'data')
            : join(process.cwd(), 'apim-database', 'scripts', 'data');
        const inventoryPath = join(inventoryDir, 'apim-inventory.json');
        if (!existsSync(inventoryPath)) {
            console.error(`❌ Inventory file not found: ${inventoryPath}. Run Part 1 first!`);
            process.exit(1);
        }
        inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    }

    // Filter by environment if flag is provided
    if (targetEnv) {
        inventory = inventory.filter((p: ProductIdentity) => p.environments.map(e => e.toUpperCase()).includes(targetEnv));
        console.log(`🎯 Filtered to ${inventory.length} products for ${targetEnv}.\n`);
    }

    if (limit > 0) {
        inventory = inventory.slice(0, limit);
        console.log(`⚠️  LIMIT MODE: Processing only ${limit} product(s) for testing.\n`);
    } else {
        console.log(`📊 Loaded ${inventory.length} unique products for discovery.`);
    }

    // 2. Setup Auth
    console.log(`🔐 [AUTH] Using PAT for ADO operations...`);

    // 3. Discovery Loop
    const results: ADOMetadata[] = [];
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const prod of inventory) {
        await sleep(2000); // Reduced delay slightly as we are being more targeted

        console.log(`\n🔹 Processing: ${prod.name} (${prod.id})`);
        const meta: ADOMetadata = { productId: prod.id, productName: prod.name, deployments: {}, status: 'ORPHAN' };

        try {
            const cleanProd = sanitize(prod.name);
            const quotedName = prod.name.includes(' ') ? `"${prod.name}"` : prod.name;
            const searchTerm = `${quotedName} (ext:tf OR ext:tfvars)`;
            const searchResp = await AzureService.searchCode(devops.organization, searchTerm, devops.pat, devops.baseUrl);

            if (!searchResp || searchResp.count === 0) {
                console.log(`   ⚠️  REPO_MISSING: No TF matches for "${prod.name}"`);
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            const repoCandidates = searchResp.results
                .filter(r => r.repository && r.repository.name)
                .map(r => {
                    const rName = r.repository.name;
                    const cleanRepo = sanitize(rName);
                    let score = 0;
                    if (cleanRepo === cleanProd) score += 100;
                    else if (cleanRepo.includes(cleanProd)) score += 50;
                    if (cleanRepo.includes('grp')) score -= 20;
                    if (cleanRepo.includes('shared') || cleanRepo.includes('common')) score -= 30;
                    return { repo: r.repository, score, name: rName };
                }).sort((a, b) => b.score - a.score);

            if (repoCandidates.length === 0) {
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            const repo = repoCandidates[0].repo;
            const repoId = repo.id || repo.name;
            let project = repo.project?.name || "Unknown";
            let projectId = repo.project?.id || "";

            if (project === "Unknown" || !projectId) {
                try {
                    const repoDetails = await AzureService.fetchRepoById(devops.organization, repoId, devops.pat, devops.baseUrl);
                    project = repoDetails.project.name;
                    projectId = repoDetails.project.id;
                } catch (e) { }
            }

            meta.repository = { id: repoId, name: repo.name, project: project, projectId: projectId || project };
            console.log(`   ✅ Repo: ${repo.name} (Score: ${repoCandidates[0].score})`);

            const pipelines = await AzureService.fetchADOPipelines(devops.organization, projectId || project, repoId, devops.pat, devops.baseUrl);
            const pipeCandidates = pipelines.map(p => {
                const cleanPipe = sanitize(p.name);
                let score = 0;
                if (cleanPipe.includes(cleanProd)) score += 50;
                if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                return { pipe: p, score, name: p.name };
            }).sort((a, b) => b.score - a.score);

            if (pipeCandidates.length === 0 || pipeCandidates[0].score < 10) {
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            const matchedPipeline = pipeCandidates[0].pipe;
            meta.pipeline = { id: matchedPipeline.id, name: matchedPipeline.name };
            meta.status = 'MATCHED';
            console.log(`   ✅ Pipeline: ${matchedPipeline.name}`);

            const envsToSync = targetEnv ? [targetEnv] : prod.environments;
            for (const envName of envsToSync) {
                const deploy = await AzureService.fetchLatestEnvironmentDeployment(
                    devops.organization, projectId || project, matchedPipeline.id, envName, devops.pat, devops.baseUrl
                );

                if (deploy) {
                    meta.deployments[envName] = {
                        hash: deploy.build?.sourceVersion || 'unknown',
                        date: deploy.finishTime || deploy.startTime
                    };
                    console.log(`      🎯 ${envName.padEnd(5)}: Surgical Hit! Captured ${meta.deployments[envName].hash.substring(0, 7)}`);
                }
            }
            results.push(meta);
        } catch (e: any) {
            console.error(`   ❌ Error: ${e.message}`);
            results.push(meta);
        }
    }

    const dataDir = existsSync(join(process.cwd(), 'scripts', 'data'))
        ? join(process.cwd(), 'scripts', 'data')
        : join(process.cwd(), 'apim-database', 'scripts', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const outputPath = join(dataDir, 'ado-metadata.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ ADO Metadata Extraction Complete! Saved to: ${outputPath}`);
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
