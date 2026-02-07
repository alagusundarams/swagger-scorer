/**
 * @fileoverview LEAN SURGICAL DISCOVERY
 * 
 * Purpose: Find repo → pipeline → environment-specific deployment hashes
 * Strategy: Surgical APIs only, fail fast with clear errors, NO fallbacks
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LeanAzureService } from '../services/LeanAzureService.js';

// --- COMMAND LINE ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');
const productNameArg = args.find(a => a.startsWith('--product='))?.split('=')[1];
const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1];
const stepArg = args.find(a => a.startsWith('--step='))?.split('=')[1];

if (help || !productNameArg) {
    console.log(`
🔬 Lean ADO Discovery (Surgical APIs Only)

Usage: 
  npx tsx scripts/debug/lean-discovery.ts --product="Product Name" [options]

Options:
  --env=DEV|QA|STAGE|PROD|ALL   Target environment (default: ALL)
  --step=repo|pipeline|env|all   Test specific step only
  --help                          Show this help

Examples:
  # Test repo discovery only
  npx tsx scripts/debug/lean-discovery.ts --product="MyProduct" --step=repo
  
  # Test full flow for one environment
  npx tsx scripts/debug/lean-discovery.ts --product="MyProduct" --env=DEV
  
  # Full discovery for all environments
  npx tsx scripts/debug/lean-discovery.ts --product="MyProduct"
    `);
    process.exit(0);
}

// --- CONFIG ---
function loadConfig() {
    const localConfig = join(process.cwd(), 'config.json');
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');

    if (existsSync(localConfig)) return JSON.parse(readFileSync(localConfig, 'utf8'));
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));

    throw new Error('config.json not found');
}

const config = loadConfig();
const devops = config.devops;

if (!devops?.pat || !devops?.organization) {
    throw new Error('devops.pat and devops.organization required in config.json');
}

// --- MAIN DISCOVERY FLOW ---
async function runLeanDiscovery() {
    console.log(`\n🔬 Lean ADO Discovery`);
    console.log(`   Product: "${productNameArg}"`);
    console.log(`   Target: ${envArg || 'ALL environments'}`);
    if (stepArg) console.log(`   Testing: ${stepArg} step only\n`);

    try {
        // Auth
        console.log('🔑 Authenticating...');
        let bearerToken: string | undefined;
        try {
            bearerToken = await LeanAzureService.getAdoAccessToken();
            console.log('   ✅ Azure CLI bearer token acquired\n');
        } catch (e: any) {
            console.log('   ⚠️  Azure CLI not available, using PAT only\n');
        }

        // STEP 1: Find Repository
        console.log('📦 STEP 1: Finding Repository...');
        const repo = await LeanAzureService.findRepo(
            devops.organization,
            productNameArg!,
            devops.pat,
            devops.baseUrl,
            bearerToken
        );
        console.log(`   Project: ${repo.project.name} (ID: ${repo.project.id})\n`);

        if (stepArg === 'repo') {
            console.log('✅ Repo discovery test complete!\n');
            console.log(JSON.stringify({ repo }, null, 2));
            return;
        }

        // STEP 2: Find Pipeline
        console.log('🔧 STEP 2: Finding Pipeline...');
        const pipeline = await LeanAzureService.findPipeline(
            devops.organization,
            repo.project.id,
            repo.id,
            devops.pat,
            devops.baseUrl,
            bearerToken
        );
        console.log('');

        if (stepArg === 'pipeline') {
            console.log('✅ Pipeline discovery test complete!\n');
            console.log(JSON.stringify({ repo, pipeline }, null, 2));
            return;
        }

        // STEP 3: Get Environment-Specific Hashes
        console.log('🌍 STEP 3: Discovering Environment-Specific Hashes...\n');

        const targetEnvs = envArg && envArg !== 'ALL'
            ? [envArg]
            : ['DEV', 'QA', 'STAGE', 'PROD'];

        const envHashes: Record<string, any> = {};

        for (const envName of targetEnvs) {
            console.log(`   📍 Processing ${envName}...`);

            try {
                // Step 3a: Get environment ID
                if (stepArg === 'env') {
                    const envId = await LeanAzureService.getEnvironmentId(
                        devops.organization,
                        repo.project.id,
                        envName,
                        devops.pat,
                        devops.baseUrl,
                        bearerToken
                    );
                    console.log(`   ✅ ${envName} environment ID test complete!\n`);
                    console.log(JSON.stringify({ envName, envId }, null, 2));
                    return;
                }

                const envId = await LeanAzureService.getEnvironmentId(
                    devops.organization,
                    repo.project.id,
                    envName,
                    devops.pat,
                    devops.baseUrl,
                    bearerToken
                );

                // Step 3b: Get latest deployment
                const deployment = await LeanAzureService.getLatestDeployment(
                    devops.organization,
                    repo.project.id,
                    envId,
                    pipeline.id,
                    devops.pat,
                    devops.baseUrl,
                    bearerToken
                );

                // Step 3c: Extract repo hash (multi-repo support)
                const repoHash = await LeanAzureService.extractRepoHash(
                    devops.organization,
                    repo.project.id,
                    deployment.buildId,
                    repo.id,
                    devops.pat,
                    devops.baseUrl,
                    bearerToken
                );

                envHashes[envName] = {
                    hash: repoHash.hash,
                    alias: repoHash.alias,
                    repoName: repoHash.repoName,
                    buildId: deployment.buildId,
                    deploymentTime: deployment.finishTime
                };

                console.log(`   ✅ ${envName}: ${repoHash.hash.substring(0, 7)} (${repoHash.alias})\n`);

            } catch (error: any) {
                console.log(`   ❌ ${envName}: ${error.message}\n`);
                envHashes[envName] = {
                    error: error.message
                };
            }
        }

        // OUTPUT
        console.log('━'.repeat(60));
        console.log('✅ DISCOVERY COMPLETE\n');

        const output = {
            product: productNameArg,
            repository: {
                name: repo.name,
                id: repo.id,
                project: repo.project.name
            },
            pipeline: {
                name: pipeline.name,
                id: pipeline.id
            },
            deployments: envHashes
        };

        console.log(JSON.stringify(output, null, 2));

        // Save to file
        const outputPath = join(process.cwd(), `lean-discovery-${productNameArg!.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`);
        writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        console.log(`\n📄 Saved to: ${outputPath}`);

    } catch (error: any) {
        console.error(`\n❌ DISCOVERY FAILED\n`);
        console.error(`Error: ${error.message}\n`);
        if (error.stack) {
            console.error('Stack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run
runLeanDiscovery().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
