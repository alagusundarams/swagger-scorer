/**
 * @fileoverview PART 3: GOVERNANCE RECONCILIATION
 * 
 * PURPOSE:
 * 1. Merges Inventory, ADO Metadata, and APIM Metadata into the database.
 * 2. Resolves App identities via Microsoft Graph.
 * 3. Updates Products, ACLs (Named Values), and App Registrations.
 */

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

interface ADOMetadata {
    productId: string;
    productName: string;
    repository: { id: string; name: string; project: string; projectId: string };
    pipeline: { id: number; name: string };
    deployments: Record<string, { hash: string; date: string }>;
    status: 'MATCHED' | 'REPO_MISSING' | 'PIPELINE_MISSING' | 'ORPHAN';
}

interface MetadataStore {
    namedValues: Record<string, any[]>;
    appIds: Record<string, string[]>;
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
    const dataDir = join(process.cwd(), 'apim-database', 'scripts', 'data');
    const inventoryPath = join(dataDir, 'apim-inventory.json');
    const adoMetaPath = join(dataDir, 'ado-metadata.json');
    const apimMetaPath = join(dataDir, 'apim-metadata.json');

    if (!existsSync(inventoryPath) || !existsSync(adoMetaPath) || !existsSync(apimMetaPath)) {
        console.error("❌ Required JSON data missing. Run Part 1 and Part 2 first.");
        process.exit(1);
    }

    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    const adoList: ADOMetadata[] = JSON.parse(readFileSync(adoMetaPath, 'utf8'));
    const apimMeta: MetadataStore = JSON.parse(readFileSync(apimMetaPath, 'utf8'));

    const adoMap = new Map<string, ADOMetadata>(adoList.map(m => [m.productId, m]));

    // 2. DB Connection
    const dbUrl = config.azure?.environments[0]?.databaseUrl || config.database?.url;
    if (!dbUrl) {
        process.exit(1);
    }
    const pool = new Pool({ connectionString: dbUrl });

    try {
        // --- A. PRODUCTS RECONCILIATION ---
        console.log(`📋 Reconciling ${inventory.length} products...`);
        for (const prod of inventory) {
            const ado = adoMap.get(prod.id);
            if (!ado) continue;

            for (const envName of prod.environments) {
                const uniqueProductId = `${prod.id}:${envName}:Global`;
                const deploy = ado.deployments[envName];
                const prodDeploy = ado.deployments['PROD'];

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
                    uniqueProductId, prod.id, prod.name, envName, 'Global',
                    deploy?.hash || null, deploy?.date || null,
                    ado.pipeline ? `https://dev.azure.com/${config.devops.organization}/${ado.repository.project}/_build?definitionId=${ado.pipeline.id}` : null,
                    ado.repository ? `https://dev.azure.com/${config.devops.organization}/${ado.repository.project}/_git/${ado.repository.name}` : null,
                    prodDeploy?.hash || null, prodDeploy?.date || null,
                    ado.status === 'MATCHED' ? 'TERRAFORM_MANAGED' : 'MANUAL'
                ]);
            }
        }

        // --- B. ACCESS CONTROL (NAMED VALUES) ---
        console.log(`🌍 Reconciling Named Values (ACL)...`);
        for (const [env, nvs] of Object.entries(apimMeta.namedValues)) {
            for (const nv of nvs) {
                const val = nv.keyVaultUrl ? `KeyVault Ref: ${nv.keyVaultUrl}` : (nv.isSecret ? '***' : nv.value);
                await pool.query(`
                    INSERT INTO access_control_lists (key, environment, value, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (key, environment) DO UPDATE SET
                        value = EXCLUDED.value,
                        updated_at = NOW();
                `, [nv.name, env, val]);
            }
        }

        // --- C. IDENTITY (APP REGISTRATIONS) ---
        console.log(`🔗 Resolving App Identities via Graph...`);
        const allAppIds = new Set<string>();
        Object.values(apimMeta.appIds).forEach(list => list.forEach(id => allAppIds.add(id)));

        if (allAppIds.size > 0) {
            const resolved = await AzureService.fetchAppRegistrations(Array.from(allAppIds));
            const appMap = new Map<string, string>(resolved.map(r => [r.appId, r.displayName]));

            for (const [env, ids] of Object.entries(apimMeta.appIds)) {
                for (const id of ids) {
                    const name = appMap.get(id) || 'Unknown Application';
                    await pool.query(`
                        INSERT INTO app_registrations (id, client_id, display_name, environment, updated_at)
                        VALUES ($1, $1, $2, $3, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            updated_at = NOW();
                    `, [id, name, env]);
                }
            }
        }

        console.log(`\n✅ Reconciliation Complete!`);

    } catch (e: any) {
        console.error(`\n❌ Reconciliation Failed:`, e.message);
    } finally {
        await pool.end();
    }
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
