/**
 * @fileoverview PART 3: GOVERNANCE RECONCILIATION
 * 
 * PURPOSE:
 * 1. Merges Inventory, ADO Metadata, and APIM Metadata into the database.
 * 2. Resolves App identities via Microsoft Graph.
 * 3. Updates Products, Named Values, and App Registrations.
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
    apiContracts: Record<string, any>;
    backends: Record<string, any[]>;
    apiForensics: Record<string, Record<string, { guids: string[], backends: string[] }>>;
    productForensics: Record<string, Record<string, { guids: string[], nvs: string[] }>>;
    productApiLinks: Record<string, Record<string, Array<{ name: string, path: string }>>>; // Updated to match extract-apim-inventory
    subscriptions: Record<string, any[]>;
}

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

async function main() {
    console.log(`🚀 [PART 3] Starting Governance Reconciliation...\n`);
    if (targetEnv) console.log(`🎯 Filtering for Environment: ${targetEnv}\n`);

    // 1. Data Loading
    const dataDir = existsSync(join(process.cwd(), 'scripts', 'data'))
        ? join(process.cwd(), 'scripts', 'data')
        : join(process.cwd(), 'apim-database', 'scripts', 'data');

    const inventoryPath = join(dataDir, 'apim-inventory.json');
    const adoMetaPath = join(dataDir, 'ado-metadata.json');
    const apimMetaPath = join(dataDir, 'apim-metadata.json');

    let inventory: any[] = [];
    let apimMeta: MetadataStore = {
        namedValues: {},
        appIds: {},
        apiContracts: {},
        backends: {},
        apiForensics: {},
        productForensics: {},
        productApiLinks: {},
        subscriptions: {}
    };

    if (sourceMode === 'db') {
        console.log(`🔌 Source: db mode. Inventory will be loaded from database.`);
    } else if (!existsSync(inventoryPath) || !existsSync(apimMetaPath)) {
        console.error("❌ Required Inventory/Metadata JSON missing. Run Part 1 first or use --source=db.");
        process.exit(1);
    }

    if (existsSync(inventoryPath)) {
        inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
        console.log(`\n� Loaded ${inventory.length} products from inventory.`);
    }

    let adoList: ADOMetadata[] = [];
    if (existsSync(adoMetaPath)) {
        adoList = JSON.parse(readFileSync(adoMetaPath, 'utf8'));
    } else {
        console.warn("⚠️  ADO Metadata (ado-metadata.json) not found. Skipping DevOps linkage.");
    }

    if (existsSync(apimMetaPath)) {
        apimMeta = JSON.parse(readFileSync(apimMetaPath, 'utf8'));
    }

    const adoMap = new Map<string, ADOMetadata>(adoList.map(m => [m.productId, m]));

    // 2. DB Connection
    const dbUrl = process.env.DATABASE_URL || config.azure?.environments[0]?.databaseUrl || config.database?.url;
    if (!dbUrl) {
        console.error("❌ Database URL missing in config.json or DATABASE_URL env var.");
        process.exit(1);
    }
    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();

    // 2.1 Fetch inventory from DB if source=db
    if (sourceMode === 'db') {
        try {
            const res = await client.query(`
                SELECT id, name, type, array_agg(DISTINCT environment) as environments 
                FROM products 
                GROUP BY id, name, type
            `);
            inventory = res.rows.map(row => ({
                id: row.id,
                name: row.name,
                type: row.type,
                environments: row.environments
            }));
            console.log(`   ✅ Loaded ${inventory.length} logical products from DB.`);
        } catch (err: any) {
            console.error(`❌ DB Connection failed during inventory fetch: ${err.message}`);
            client.release();
            process.exit(1);
        }
    }

    try {
        // BEGIN TRANSACTION
        // await client.query('BEGIN');
        console.log('🔒 Transaction started (DISABLED for Debugging)...\n');

        // --- A. PRODUCTS RECONCILIATION ---
        console.log(`� Reconciling ${inventory.length} products...`);
        for (const prod of inventory) {
            // Safety Check: Name is required
            if (!prod.name) {
                console.warn(`⚠️  Skipping product with missing name: ${JSON.stringify(prod)}`);
                continue;
            }

            const ado = adoMap.get(prod.id) || {
                productId: prod.id,
                productName: prod.name,
                repository: null,
                pipeline: null,
                deployments: {},
                status: 'ORPHAN'
            };

            const devDeploy = (ado.deployments as any)['DEV'];
            const qaDeploy = (ado.deployments as any)['QA'];
            const stageDeploy = (ado.deployments as any)['STAGE'];
            const prodDeploy = (ado.deployments as any)['PROD'];

            try {
                const repoProject = (ado.repository as any)?.project;
                const repoName = (ado.repository as any)?.name;
                const pipelineId = ado.pipeline?.id;

                const pipelineUrl = (ado.pipeline && repoProject)
                    ? AzureService.getVstsUrl(config.devops.baseUrl, config.devops.organization, repoProject, `_build?definitionId=${pipelineId}`)
                    : null;

                const gitRepoUrl = (repoProject && repoName)
                    ? AzureService.getVstsUrl(config.devops.baseUrl, config.devops.organization, repoProject, `_git/${repoName}`)
                    : null;

                // Iterate through environments for this product (Tall Model)
                // Robust fallback: If array is empty or null, default to ['DEV']
                const envs = (prod.environments && prod.environments.length > 0) ? prod.environments : ['DEV'];

                for (const env of envs) {
                    const upperEnv = env.toUpperCase();

                    // NOTE: Removed strict targetEnv filtering inside loop to ensure data integrity across regions.
                    // If you strictly need filtering, rely on the upstream extraction process.

                    const deployment = (ado.deployments as any)[upperEnv] || {};
                    const targetId = `${prod.id}:${upperEnv}:Global`;

                    if (process.env.DEBUG_SQL) console.log(`[DB] Upserting Product: ${targetId} (Name: ${prod.id}, Display: ${prod.name})`);
                    await client.query(`
                        INSERT INTO products (
                            id, name, display_name, version, state, environment, region,
                            pipeline_url, git_repo_url,
                            last_deployed_commit_hash, last_deployed_at,
                            management_mode, updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            pipeline_url = COALESCE(EXCLUDED.pipeline_url, products.pipeline_url),
                            git_repo_url = COALESCE(EXCLUDED.git_repo_url, products.git_repo_url),
                            last_deployed_commit_hash = COALESCE(EXCLUDED.last_deployed_commit_hash, products.last_deployed_commit_hash),
                            last_deployed_at = COALESCE(EXCLUDED.last_deployed_at, products.last_deployed_at),
                            management_mode = EXCLUDED.management_mode,
                            updated_at = NOW();
                    `, [
                        targetId, prod.id, prod.name, null, 'published', upperEnv, 'Global',
                        pipelineUrl, gitRepoUrl,
                        deployment.hash || null, deployment.date || null,
                        ado.status === 'MATCHED' ? 'TERRAFORM_MANAGED' : 'UNTRACKED'
                    ]);
                }

                if (verbose) {
                    const mode = ado.status === 'MATCHED' ? '🔧 TERRAFORM' : '📦 PORTAL';
                    console.log(`   📦 Product: "${prod.name}" (${prod.id}) - ${mode}`);
                }
            } catch (err: any) {
                console.error(`❌ FAILED to sync Product: "${prod.name}"`);
                console.error(`   Details: ${err.message}`);
                if (err.detail) console.error(`   DB Detail: ${err.detail}`);
                throw err;
            }

            // --- A.2 APIS RECONCILIATION ---
            for (const envName of prod.environments) {
                const upperEnv = envName.toUpperCase();
                const targetProductId = `${prod.id}:${upperEnv}:Global`;
                const apiDetails = apimMeta.productApiLinks[envName]?.[prod.id] || [];
                if (verbose && apiDetails.length > 0) {
                    console.log(`      🔌 [${envName}] APIs: ${apiDetails.length} linked to product`);
                }

                for (const api of apiDetails) {
                    const apiName = typeof api === 'string' ? api : api.name;
                    const apiPath = typeof api === 'string' ? `/${api}` : (api.path || null);
                    const uniqueApiId = `${prod.id}:${envName}:${apiName}`;

                    try {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Upserting API: ${uniqueApiId} (Parent: ${targetProductId})`);
                        await client.query(`
                                INSERT INTO apis (id, product_id, name, display_name, path, updated_at)
                                VALUES ($1, $2, $3, $4, $5, NOW())
                                ON CONFLICT (id) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    display_name = EXCLUDED.display_name,
                                    path = EXCLUDED.path,
                                    updated_at = NOW();
                            `, [uniqueApiId, targetProductId, apiName, apiName, apiPath]);

                        // Link to Backends
                        const forensics = apimMeta.apiForensics[envName]?.[apiName];
                        if (forensics) {
                            for (const bId of forensics.backends) {
                                if (process.env.DEBUG_SQL) console.log(`[DB] Linking API ${uniqueApiId} to Backend ${bId} in ${envName}`);
                                await client.query(`
                                        INSERT INTO api_backends (api_id, backend_id, environment)
                                        VALUES ($1, $2, $3)
                                        ON CONFLICT (api_id, backend_id, environment) DO NOTHING;
                                    `, [uniqueApiId, bId, envName]);
                            }
                        }

                        // --- OPERATIONS EXTRACTION ---
                        const apiContract = apimMeta.apiContracts[apiName];
                        if (apiContract && apiContract.definition) {
                            const spec = apiContract.definition;
                            const paths = spec.paths || {};
                            for (const [pathTemplate, pathItem] of Object.entries(paths)) {
                                const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
                                for (const method of methods) {
                                    const operation = (pathItem as any)[method];
                                    if (operation) {
                                        const operationId = `${uniqueApiId}:${method}:${pathTemplate.replace(/\//g, '_')}`;
                                        const operationName = operation.operationId || `${method}_${pathTemplate.replace(/\//g, '_')}`;
                                        const summary = operation.summary || operation.description || pathTemplate;
                                        if (process.env.DEBUG_SQL) console.log(`[DB] Upserting Operation: ${operationId} (API: ${uniqueApiId})`);
                                        await client.query(`
                                                INSERT INTO operations (id, api_id, name, display_name, method, url_template, description)
                                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                                ON CONFLICT (id) DO UPDATE SET
                                                    name = EXCLUDED.name,
                                                    display_name = EXCLUDED.display_name,
                                                    method = EXCLUDED.method,
                                                    url_template = EXCLUDED.url_template,
                                                    description = EXCLUDED.description;
                                            `, [
                                            operationId, uniqueApiId, operationName, summary,
                                            method.toUpperCase(), pathTemplate, operation.description || ''
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (err: any) {
                        console.error(`❌ FAILED to sync API/Operation: "${apiName}" in Product "${prod.name}" (${envName})`);
                        console.error(`   Details: ${err.message}`);
                        throw err;
                    }
                }
            }
        }

        // --- B. ACCESS CONTROL (NAMED VALUES) ---
        console.log(`🌍 Reconciling Named Values...`);
        for (const [env, nvs] of Object.entries(apimMeta.namedValues)) {
            const upperEnv = env.toUpperCase();
            // FIXED: Map to environment-specific product IDs
            const envProductIds = inventory
                .filter((p: any) => p.environments.map((e: any) => e.toUpperCase()).includes(upperEnv))
                .map((p: any) => `${p.id}:${upperEnv}:Global`);

            console.log(`   [${env}] Processing ${nvs.length} Named Values...`);

            for (const nv of nvs) {
                // Validation
                if (!nv.name) {
                    console.warn(`⚠️  Skipping named value with missing name in ${env}`);
                    continue;
                }
                const val = nv.keyVaultUrl ? nv.keyVaultUrl : (nv.value || '');
                const type = nv.keyVaultUrl ? 'key_vault' : 'literal';
                const nvId = `nv-${env}-${nv.name}`;

                try {
                    if (process.env.DEBUG_SQL) console.log(`[DB] Upserting Named Value: ${nvId} (Display: ${nv.displayName}, Env: ${env})`);
                    await client.query(`
                        INSERT INTO named_values (id, product_id, display_name, system_name, value, type, is_secret, environment, region, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            value = EXCLUDED.value,
                            type = EXCLUDED.type,
                            is_secret = EXCLUDED.is_secret,
                            updated_at = NOW();
                    `, [nvId, null, nv.displayName, nv.name, val, type, nv.isSecret, env, 'Global']);

                    if (envProductIds.length > 0) {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Linking Named Value ${nvId} to products: ${envProductIds.join(', ')}`);
                        await client.query(`
                            INSERT INTO product_named_values (product_id, named_value_id, is_owner, can_modify)
                            SELECT unnest($1::text[]), $2, true, true
                            ON CONFLICT (product_id, named_value_id) DO NOTHING
                        `, [envProductIds, nvId]);
                    }
                    if (verbose) console.log(`      ✅ Synced: "${nv.name}"`);
                } catch (err: any) {
                    console.error(`❌ FAILED to sync Named Value: "${nv.name}" (${env}): ${err.message}`);
                }
            }
        }

        // --- C. IDENTITY (APP REGISTRATIONS) ---
        console.log(`🔗 Resolving App Identities via Graph...`);
        const allAppIds = new Set<string>();
        Object.values(apimMeta.appIds).forEach(list => list.forEach(id => allAppIds.add(id)));

        if (allAppIds.size > 0) {
            const resolved = await AzureService.fetchAppRegistrations(Array.from(allAppIds));
            const appMap = new Map();
            resolved.forEach(r => appMap.set(r.appId, r));

            for (const [env, ids] of Object.entries(apimMeta.appIds)) {
                for (const id of ids) {
                    const resolvedApp = appMap.get(id);
                    const name = resolvedApp?.displayName || 'Unknown Application';
                    const appIdUri = resolvedApp?.appIdUri || null;

                    // Usage Discovery
                    let linkedProductId: string | null = null;
                    let linkedApiId: string | null = null;

                    // Product usage?
                    const prodForensics = apimMeta.productForensics[env];
                    if (prodForensics) {
                        for (const [prodName, forensics] of Object.entries(prodForensics)) {
                            if (forensics.guids.includes(id)) {
                                // FIXED: prodName is already the product name from forensics
                                // prodName from forensics IS the APIM product ID (p.name from APIM)
                                linkedProductId = `${prodName}:${env.toUpperCase()}:Global`;
                                break;
                            }
                        }
                    }

                    // API usage?
                    if (!linkedProductId) {
                        const apiForensics = apimMeta.apiForensics[env];
                        if (apiForensics) {
                            for (const [apiName, forensics] of Object.entries(apiForensics)) {
                                if (forensics.guids.includes(id)) {
                                    // Found API usage, now find the parent product
                                    for (const [prodName, apis] of Object.entries(apimMeta.productApiLinks[env] || {})) {
                                        if (apis.some(a => (typeof a === 'string' ? a === apiName : a.name === apiName))) {
                                            // FIXED: prodName is already the product name from productApiLinks
                                            // prodName from productApiLinks IS the APIM product ID (p.name from APIM)
                                            linkedProductId = `${prodName}:${env.toUpperCase()}:Global`;
                                            linkedApiId = `${prodName}:${env.toUpperCase()}:${apiName}`;
                                            break;
                                        }
                                    }
                                    if (linkedApiId) break;
                                }
                            }
                        }
                    }

                    // SAFETY: Verify product exists if we're linking to one
                    if (linkedProductId) {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Checking product existence for ${linkedProductId}`);
                        const prodCheck = await client.query('SELECT 1 FROM products WHERE id = $1', [linkedProductId]);
                        if (prodCheck.rows.length === 0) {
                            console.warn(`⚠️  Skipping app reg "${name}" - linked product ${linkedProductId} not found in DB`);
                            continue;
                        }
                    }

                    // Similarly check api_id if present
                    if (linkedApiId) {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Checking API existence for ${linkedApiId}`);
                        const apiCheck = await client.query('SELECT 1 FROM apis WHERE id = $1', [linkedApiId]);
                        if (apiCheck.rows.length === 0) {
                            console.warn(`⚠️  Skipping app reg "${name}" - linked API ${linkedApiId} not found in DB`);
                            continue;
                        }
                    }


                    // Verify product exists in DB to avoid FK violation
                    if (linkedProductId) {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Checking product existence for ${linkedProductId}`);
                        const prodCheck = await client.query('SELECT 1 FROM products WHERE id = $1', [linkedProductId]);
                        if (prodCheck.rows.length === 0) {
                            console.warn(`⚠️  App Registration "${name}" links to missing product ${linkedProductId} - Setting to NULL`);
                            linkedProductId = null;
                        }
                    }

                    // Verify API exists in DB
                    if (linkedApiId) {
                        if (process.env.DEBUG_SQL) console.log(`[DB] Checking API existence for ${linkedApiId}`);
                        const apiCheck = await client.query('SELECT 1 FROM apis WHERE id = $1', [linkedApiId]);
                        if (apiCheck.rows.length === 0) {
                            console.warn(`⚠️  App Registration "${name}" links to missing API ${linkedApiId} - Setting to NULL`);
                            linkedApiId = null;
                        }
                    }

                    if (process.env.DEBUG_SQL) console.log(`[DB] Upserting App Registration: ${id} (Name: ${name}, Prod: ${linkedProductId}, API: ${linkedApiId})`);
                    await client.query(`
                        INSERT INTO app_registrations (id, client_id, display_name, app_id_uri, environment, product_id, api_id, type, updated_at)
                        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            app_id_uri = EXCLUDED.app_id_uri,
                            product_id = CASE WHEN EXCLUDED.product_id IS NULL THEN app_registrations.product_id ELSE EXCLUDED.product_id END,
                            api_id = CASE WHEN EXCLUDED.api_id IS NULL THEN app_registrations.api_id ELSE EXCLUDED.api_id END,
                            type = EXCLUDED.type,
                            updated_at = NOW();
                    `, [id, name, appIdUri, env, linkedProductId, linkedApiId, linkedProductId ? 'PRODUCT' : (linkedApiId ? 'API' : 'PRODUCT')]);
                }
            }
        }

        // --- D. BACKENDS ---
        console.log(`🔌 Reconciling Backend inventory...`);
        for (const [env, backends] of Object.entries(apimMeta.backends)) {
            for (const b of backends) {
                if (process.env.DEBUG_SQL) console.log(`[DB] Upserting Backend: ${b.id} (Env: ${env})`);
                await client.query(`
                    INSERT INTO governance_backends (id, environment, url, description, title, protocol, scope, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (id, environment) DO UPDATE SET
                        url = EXCLUDED.url, description = EXCLUDED.description, title = EXCLUDED.title,
                        protocol = EXCLUDED.protocol, updated_at = NOW();
                `, [b.id, env, b.url, b.description, b.title, b.protocol, 'GLOBAL']);
            }
        }

        // --- E. SUBSCRIPTIONS ---
        console.log(`🔑 Reconciling Subscriptions...`);
        for (const [env, subs] of Object.entries(apimMeta.subscriptions)) {
            const upperEnv = env.toUpperCase();
            for (const sub of subs) {
                // Validation
                if (!sub.id) {
                    console.warn(`⚠️  Skipping subscription with missing id in ${env}`);
                    continue;
                }

                const subId = `${env}:${sub.id}`;

                // FIXED: Convert logical productId to environment-specific
                // Robust lookup: Case-insensitive match & trim
                const subProdIdSafe = (sub.productId || '').trim().toLowerCase();
                const prod = inventory.find((p: any) => p.id.trim().toLowerCase() === subProdIdSafe);

                if (!prod) {
                    console.warn(`⚠️  Skipping subscription "${sub.displayName}" - product ${sub.productId} not found in inventory.`);
                    // Debug: list first 5 inventory IDs to verify format
                    if (apimMeta.subscriptions[env].indexOf(sub) === 0) {
                        console.warn(`      (Debug) Available Inventory IDs: ${inventory.slice(0, 5).map((p: any) => p.id).join(', ')}`);
                    }
                    continue;
                }
                const productId = `${prod.id}:${upperEnv}:Global`;

                // Verify product exists in DB to avoid FK violation
                const dbProd = await client.query('SELECT 1 FROM products WHERE id = $1', [productId]);
                if (dbProd.rows.length === 0) {
                    console.warn(`⚠️  Skipping subscription "${sub.displayName}" - Product DB Record ${productId} not found (Inventory mismatch?)`);
                    continue;
                }

                let subscriberTeamId: string | null = null;
                const ownerMatch = sub.ownerId?.match(/\/users\/(.+)/);
                const ownerUserId = ownerMatch ? ownerMatch[1] : null;

                if (sub.displayName?.startsWith('default_')) {
                    const prodRes = await client.query('SELECT owner_team_id FROM products WHERE id = $1', [productId]);
                    subscriberTeamId = prodRes.rows[0]?.owner_team_id || null;
                } else if (ownerUserId) {
                    const teamRes = await client.query('SELECT id FROM teams WHERE id = $1', [ownerUserId]);
                    if (teamRes.rows.length > 0) subscriberTeamId = ownerUserId;
                }

                if (process.env.DEBUG_SQL) console.log(`   [DB] Subscription: ${sub.displayName} -> Prod: ${productId}`);
                await client.query(`
                    INSERT INTO subscriptions (id, product_id, subscriber_team_id, display_name, state, created_at, expiration_date, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        state = EXCLUDED.state, display_name = EXCLUDED.display_name, updated_at = NOW();
                `, [subId, productId, subscriberTeamId, sub.displayName, sub.state, sub.createdDate, sub.expirationDate]);
            }
        }

        // COMMIT TRANSACTION
        // await client.query('COMMIT');
        console.log(`\n✅ Reconciliation Complete!`);
        const pCount = await client.query(`SELECT COUNT(*) FROM products`);
        const aCount = await client.query(`SELECT COUNT(*) FROM apis`);
        console.log(`   Products: ${pCount.rows[0].count} | APIs: ${aCount.rows[0].count}`);

    } catch (e: any) {
        // ROLLBACK ON ERROR
        // await client.query('ROLLBACK');
        console.error(`\n❌ Reconciliation Failed:`, e.message);
        if (e.stack) console.error(e.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
