/**
 * @fileoverview PART 3: GOVERNANCE RECONCILIATION
 * 
 * PURPOSE:
 * Merges the APIM Inventory (Part 1) and ADO Metadata (Part 2) into the database.
 * Updates product records with Pipeline IDs, Repo URLs, and per-environment hashes.
 */

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ADOMetadata {
    productId: string;
    productName: string;
    repository: { id: string; name: string; project: string; projectId: string };
    pipeline: { id: number; name: string };
    deployments: Record<string, { hash: string; date: string }>;
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

// --- CONFIG LOADER ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));
    return {};
}

const config = loadConfig();

async function main() {
    console.log(`🚀 [PART 3] Starting Governance Reconciliation...\n`);

    // 1. Data Loading
    const inventoryPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'apim-inventory.json');
    const metadataPath = join(process.cwd(), 'apim-database', 'scripts', 'data', 'ado-metadata.json');

    if (!existsSync(inventoryPath) || !existsSync(metadataPath)) {
        console.error("❌ Required JSON data missing. Run Part 1 and Part 2 first.");
        process.exit(1);
    }

    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    const metadataList: ADOMetadata[] = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const metadataMap = new Map<string, ADOMetadata>(metadataList.map((m: ADOMetadata) => [m.productId, m]));

    // 2. DB Connection
    const envConfig = config.azure?.environments[0];
    const dbUrl = envConfig?.databaseUrl || config.database?.url;
    if (!dbUrl) {
        console.error("❌ Database URL not found in config.json");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: dbUrl });

    try {
        console.log(`📋 Reconciling ${inventory.length} products to DB...`);

        for (const prod of inventory) {
            const meta = metadataMap.get(prod.id);
            if (!meta) continue;

            const region = 'Global'; // Defaulting for simple reconcile

            // Loop through environments where this product exists
            for (const envName of prod.environments) {
                const uniqueProductId = `${prod.id}:${envName}:${region}`;
                const deploy = meta.deployments[envName];
                const prodDeploy = meta.deployments['PROD'];

                console.log(`   📝 Updating ${uniqueProductId}...`);

                // We use ON CONFLICT to ensure we don't break existing governance fields (like Team Ownership)
                // but we update the discovered technical fields.
                await pool.query(`
                    INSERT INTO products (
                        id, name, display_name, environment, region,
                        last_deployed_commit_hash, last_deployed_at,
                        terraform_pipeline_url, github_url,
                        production_hash, production_deployment_date,
                        management_mode, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        last_deployed_commit_hash = COALESCE(EXCLUDED.last_deployed_commit_hash, products.last_deployed_commit_hash),
                        last_deployed_at = COALESCE(EXCLUDED.last_deployed_at, products.last_deployed_at),
                        terraform_pipeline_url = COALESCE(EXCLUDED.terraform_pipeline_url, products.terraform_pipeline_url),
                        github_url = COALESCE(EXCLUDED.github_url, products.github_url),
                        production_hash = COALESCE(EXCLUDED.production_hash, products.production_hash),
                        production_deployment_date = COALESCE(EXCLUDED.production_deployment_date, products.production_deployment_date),
                        management_mode = EXCLUDED.management_mode,
                        updated_at = NOW();
                `, [
                    uniqueProductId, prod.id, prod.name, envName, region,
                    deploy?.hash || null, deploy?.date || null,
                    meta.pipeline ? `https://dev.azure.com/${config.devops.organization}/${meta.repository.project}/_build?definitionId=${meta.pipeline.id}` : null,
                    meta.repository ? `https://dev.azure.com/${config.devops.organization}/${meta.repository.project}/_git/${meta.repository.name}` : null,
                    prodDeploy?.hash || null, prodDeploy?.date || null,
                    meta.status === 'MATCHED' ? 'TERRAFORM_MANAGED' : 'MANUAL'
                ]);
            }
        }

        console.log(`\n✅ Reconciliation Complete! Database is now the source of truth.`);

    } catch (e: any) {
        console.error(`\n❌ Reconciliation Failed:`, e.message);
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error(`\n💥 Fatal Error:`, err);
});
