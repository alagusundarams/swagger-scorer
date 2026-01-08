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
    }

    // Load ADO Metadata if available, else warn and use empty
    let adoList: ADOMetadata[] = [];
    if (existsSync(adoMetaPath)) {
        adoList = JSON.parse(readFileSync(adoMetaPath, 'utf8'));
    } else {
        console.warn("⚠️  ADO Metadata (ado-metadata.json) not found. Skipping DevOps linkage.");
    }

    if (existsSync(apimMetaPath)) {
        apimMeta = JSON.parse(readFileSync(apimMetaPath, 'utf8'));
    }

    // Filter by environment if flag is provided
    if (targetEnv) {
        inventory = inventory.filter((p: any) => p.environments.map((e: any) => e.toUpperCase()).includes(targetEnv));

        // Match environment keys in apimMeta (case-insensitive)
        const nvKey = Object.keys(apimMeta.namedValues).find(k => k.toUpperCase() === targetEnv);
        apimMeta.namedValues = nvKey ? { [nvKey]: apimMeta.namedValues[nvKey] } : {};

        const appKey = Object.keys(apimMeta.appIds).find(k => k.toUpperCase() === targetEnv);
        apimMeta.appIds = appKey ? { [appKey]: apimMeta.appIds[appKey] } : {};

        const backKey = Object.keys(apimMeta.backends).find(k => k.toUpperCase() === targetEnv);
        apimMeta.backends = backKey ? { [backKey]: apimMeta.backends[backKey] } : {};

        const forensicsKey = Object.keys(apimMeta.apiForensics).find(k => k.toUpperCase() === targetEnv);
        apimMeta.apiForensics = forensicsKey ? { [forensicsKey]: apimMeta.apiForensics[forensicsKey] } : {};

        const prodForensicsKey = Object.keys(apimMeta.productForensics).find(k => k.toUpperCase() === targetEnv);
        apimMeta.productForensics = prodForensicsKey ? { [prodForensicsKey]: apimMeta.productForensics[prodForensicsKey] } : {};

        const linksKey = Object.keys(apimMeta.productApiLinks).find(k => k.toUpperCase() === targetEnv);
        apimMeta.productApiLinks = linksKey ? { [linksKey]: apimMeta.productApiLinks[linksKey] } : {};

        console.log(`📊 Filtered to ${inventory.length} products associated with ${targetEnv}.`);
    }

    const adoMap = new Map<string, ADOMetadata>(adoList.map(m => [m.productId, m]));

    // 2. DB Connection
    const dbUrl = process.env.DATABASE_URL || config.azure?.environments[0]?.databaseUrl || config.database?.url;
    if (!dbUrl) {
        console.error("❌ Database URL missing in config.json or DATABASE_URL env var.");
        process.exit(1);
    }
    const pool = new Pool({ connectionString: dbUrl });

    // 2.1 Fetch inventory from DB if source=db
    if (sourceMode === 'db') {
        try {
            const res = await pool.query(`
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
            process.exit(1);
        }
    }

    try {
        // --- A. PRODUCTS RECONCILIATION ---
        console.log(`📋 Reconciling ${inventory.length} products...`);
        for (const prod of inventory) {
            const ado = adoMap.get(prod.id) || {
                productId: prod.id,
                productName: prod.name,
                repository: null,
                pipeline: null,
                deployments: {},
                status: 'ORPHAN'
            };

            for (const envName of prod.environments) {
                const uniqueProductId = `${prod.id}:${envName}:Global`;
                const localDeploy = (ado.deployments as any)[envName];
                const devDeploy = (ado.deployments as any)['DEV'];
                const qaDeploy = (ado.deployments as any)['QA'];
                const stageDeploy = (ado.deployments as any)['STAGE'];
                const prodDeploy = (ado.deployments as any)['PROD'];

                try {
                    await pool.query(`
                        INSERT INTO products (
                            id, name, display_name, version, state, environment, region,
                            last_deployed_commit_hash, last_deployed_at,
                            terraform_pipeline_url, github_url,
                            dev_hash, dev_deployment_date,
                            qa_hash, qa_deployment_date,
                            stage_hash, stage_deployment_date,
                            production_hash, production_deployment_date,
                            management_mode, updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            last_deployed_commit_hash = COALESCE(EXCLUDED.last_deployed_commit_hash, products.last_deployed_commit_hash),
                            last_deployed_at = COALESCE(EXCLUDED.last_deployed_at, products.last_deployed_at),
                            terraform_pipeline_url = COALESCE(EXCLUDED.terraform_pipeline_url, products.terraform_pipeline_url),
                            github_url = COALESCE(EXCLUDED.github_url, products.github_url),
                            dev_hash = EXCLUDED.dev_hash,
                            dev_deployment_date = EXCLUDED.dev_deployment_date,
                            qa_hash = EXCLUDED.qa_hash,
                            qa_deployment_date = EXCLUDED.qa_deployment_date,
                            stage_hash = EXCLUDED.stage_hash,
                            stage_deployment_date = EXCLUDED.stage_deployment_date,
                            production_hash = EXCLUDED.production_hash,
                            production_deployment_date = EXCLUDED.production_deployment_date,
                            management_mode = EXCLUDED.management_mode,
                            updated_at = NOW();
                    `, [
                        uniqueProductId, prod.id, prod.name, null, 'published', envName, 'Global',
                        localDeploy?.hash || null, localDeploy?.date || null,
                        ado.pipeline ? `${config.devops.baseUrl}/${config.devops.organization}/${(ado.repository as any)?.project}/_build?definitionId=${ado.pipeline.id}` : null,
                        ado.repository ? `${config.devops.baseUrl}/${config.devops.organization}/${(ado.repository as any)?.project}/_git/${(ado.repository as any)?.name}` : null,
                        devDeploy?.hash || null, devDeploy?.date || null,
                        qaDeploy?.hash || null, qaDeploy?.date || null,
                        stageDeploy?.hash || null, stageDeploy?.date || null,
                        prodDeploy?.hash || null, prodDeploy?.date || null,
                        ado.status === 'MATCHED' ? 'TERRAFORM_MANAGED' : 'UNTRACKED'
                    ]);
                } catch (err: any) {
                    console.error(`❌ FAILED to sync Product: "${prod.name}" (${envName})`);
                    console.error(`   Details: ${err.message}`);
                    throw err;
                }

                if (verbose) {
                    const mode = ado.status === 'MATCHED' ? '🔧 TERRAFORM' : '📦 PORTAL';
                    const hash = localDeploy?.hash?.substring(0, 7) || 'none';
                    console.log(`   📦 Product: "${prod.name}" (${envName}) - ${mode} - Hash: ${hash}`);
                }

                // --- A.2 APIS RECONCILIATION (Hierarchical) ---
                const apiDetails = apimMeta.productApiLinks[envName]?.[prod.id] || [];
                if (verbose && apiDetails.length > 0) {
                    console.log(`      🔌 APIs: ${apiDetails.length} linked to product`);
                }

                for (const api of apiDetails) {
                    const apiName = typeof api === 'string' ? api : api.name;  // Backward compatibility (Option B)
                    const apiPath = typeof api === 'string' ? `/${api}` : (api.path || null);  // Use captured path or NULL (hybrid approach)
                    const uniqueApiId = `${uniqueProductId}:${apiName}`;
                    try {
                        await pool.query(`
                            INSERT INTO apis (id, product_id, name, display_name, path, updated_at)
                            VALUES ($1, $2, $3, $4, $5, NOW())
                            ON CONFLICT (id) DO UPDATE SET
                                name = EXCLUDED.name,
                                display_name = EXCLUDED.display_name,
                                path = EXCLUDED.path,
                                updated_at = NOW();
                        `, [uniqueApiId, uniqueProductId, apiName, apiName, apiPath]);
                    } catch (err: any) {
                        console.error(`❌ FAILED to sync API: "${apiName}" in Product "${prod.name}"`);
                        console.error(`   Details: ${err.message}`);
                        throw err;
                    }

                    if (verbose) {
                        console.log(`         📄 API: "${apiName}"`);
                    }

                    // Link to Backends
                    const forensics = apimMeta.apiForensics[envName]?.[apiName];
                    if (forensics) {
                        for (const bId of forensics.backends) {
                            await pool.query(`
                                INSERT INTO api_backends (api_id, backend_id, environment)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (api_id, backend_id, environment) DO NOTHING;
                            `, [uniqueApiId, bId, envName]);

                            if (verbose) {
                                console.log(`            🔌 Backend: ${bId}`);
                            }
                        }
                    }

                    // --- OPERATIONS EXTRACTION FROM OPENAPI SPEC ---
                    const apiContract = apimMeta.apiContracts[apiName];
                    if (apiContract && apiContract.definition) {
                        const spec = apiContract.definition;
                        const paths = spec.paths || {};
                        let operationsCount = 0;

                        for (const [pathTemplate, pathItem] of Object.entries(paths)) {
                            const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

                            for (const method of methods) {
                                const operation = (pathItem as any)[method];
                                if (operation) {
                                    // Generate unique operation ID: apiId:method:path
                                    const operationId = `${uniqueApiId}:${method}:${pathTemplate.replace(/\//g, '_')}`;
                                    const operationName = operation.operationId || `${method}_${pathTemplate.replace(/\//g, '_')}`;
                                    const summary = operation.summary || operation.description || pathTemplate;
                                    const description = operation.description || '';

                                    try {
                                        await pool.query(`
                                            INSERT INTO operations (id, api_id, name, display_name, method, url_template, description)
                                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                                            ON CONFLICT (id) DO UPDATE SET
                                                name = EXCLUDED.name,
                                                display_name = EXCLUDED.display_name,
                                                method = EXCLUDED.method,
                                                url_template = EXCLUDED.url_template,
                                                description = EXCLUDED.description;
                                        `, [
                                            operationId,
                                            uniqueApiId,
                                            operationName,
                                            summary,
                                            method.toUpperCase(),
                                            pathTemplate,
                                            description
                                        ]);
                                        operationsCount++;
                                    } catch (err: any) {
                                        console.error(`❌ FAILED to sync Operation: ${method.toUpperCase()} ${pathTemplate}`);
                                        console.error(`   API: "${apiName}", Details: ${err.message}`);
                                    }
                                }
                            }
                        }

                        if (verbose && operationsCount > 0) {
                            console.log(`            📍 Operations: ${operationsCount} extracted from OpenAPI spec`);
                        }
                    }
                }
            }
        }

        // --- B. ACCESS CONTROL (NAMED VALUES) ---
        console.log(`🌍 Reconciling Named Values...`);
        for (const [env, nvs] of Object.entries(apimMeta.namedValues)) {
            for (const nv of nvs) {
                const val = nv.keyVaultUrl ? nv.keyVaultUrl : (nv.value || '');
                const type = nv.keyVaultUrl ? 'key_vault' : 'literal';

                // Deterministic ID for idempotency: env + systemName + optional scope
                const nvId = `nv-${env}-${nv.name}`;

                try {
                    // Insert/update named value (product_id stays NULL for now)
                    await pool.query(`
                        INSERT INTO named_values (id, product_id, display_name, system_name, value, type, is_secret, environment, region, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                        ON CONFLICT (id) 
                        DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            value = EXCLUDED.value,
                            type = EXCLUDED.type,
                            is_secret = EXCLUDED.is_secret,
                            updated_at = NOW();
                    `, [nvId, null, nv.displayName, nv.name, val, type, nv.isSecret, env, 'Global']);

                    // NEW: Link to products in this environment via junction table
                    // Strategy: All products in this env get read-write access (can be refined later)
                    const envProducts = inventory.filter((p: any) =>
                        p.environments.map((e: any) => e.toUpperCase()).includes(env.toUpperCase())
                    );

                    for (const prod of envProducts) {
                        const uniqueProductId = `${prod.id}:${env}`;
                        await pool.query(`
                            INSERT INTO product_named_values (product_id, named_value_id, is_owner, can_modify)
                            VALUES ($1, $2, true, true)
                            ON CONFLICT (product_id, named_value_id) DO NOTHING
                        `, [uniqueProductId, nvId]);
                    }
                } catch (err: any) {
                    console.error(`❌ FAILED to sync Named Value: "${nv.name}" (Env: ${env})`);
                    console.error(`   Value: "${val}" (Is Secret: ${nv.isSecret})`);
                    console.error(`   Details: ${err.message}`);
                    throw err;
                }
            }
        }

        // --- C. IDENTITY (APP REGISTRATIONS) ---
        console.log(`🔗 Resolving App Identities via Graph...`);
        const allAppIds = new Set<string>();
        Object.values(apimMeta.appIds).forEach(list => list.forEach(id => allAppIds.add(id)));
        console.log(`   Found ${allAppIds.size} unique App IDs to resolve`);

        if (allAppIds.size > 0) {
            const resolved = await AzureService.fetchAppRegistrations(Array.from(allAppIds));
            const appMap = new Map<string, { name: string, uri?: string }>(resolved.map(r => [r.appId, { name: r.displayName, uri: r.appIdUri }]));
            console.log(`   ✅ Resolved ${appMap.size} App Registrations via Microsoft Graph`);

            for (const [env, ids] of Object.entries(apimMeta.appIds)) {
                for (const id of ids) {
                    const resolvedApp = appMap.get(id);
                    const name = resolvedApp?.name || 'Unknown Application';
                    const appIdUri = resolvedApp?.uri || null;

                    // HEURISTIC: Find linkages in Forensics
                    let linkedProductId: string | null = null;
                    let linkedApiId: string | null = null;
                    let identityType = 'PRODUCT'; // Default

                    // 1. Check Products (Priority)
                    if (apimMeta.productForensics[env]) {
                        for (const [prodName, forensics] of Object.entries(apimMeta.productForensics[env])) {
                            if (forensics.guids.includes(id)) {
                                // Found usage in this product
                                // Need to resolve Product ID. We have inventory.
                                const p = inventory.find(i => i.name === prodName);
                                if (p) {
                                    // Construct the unique product ID used in DB
                                    linkedProductId = `${p.id}:${env}:Global`;
                                    identityType = 'PRODUCT';
                                    break; // Assume 1:1 for now
                                }
                            }
                        }
                    }

                    // 2. Check APIs (Secondary)
                    if (!linkedProductId && apimMeta.apiForensics[env]) {
                        for (const [apiName, forensics] of Object.entries(apimMeta.apiForensics[env])) {
                            if (forensics.guids.includes(id)) {
                                // Found usage in this API
                                // Need to find which Product it belongs to -> then construct API ID?
                                // Actually, we just need API ID: `productId:env:Global:apiName`
                                // We can search `apimMeta.productApiLinks` to find the parent product
                                if (apimMeta.productApiLinks[env]) {
                                    for (const [prodName, apis] of Object.entries(apimMeta.productApiLinks[env])) {
                                        if (apis.some(a => a.name === apiName)) {
                                            const p = inventory.find(i => i.name === prodName);
                                            if (p) {
                                                const uniqueProductId = `${p.id}:${env}:Global`;
                                                linkedApiId = `${uniqueProductId}:${apiName}`;
                                                identityType = 'API';
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (linkedApiId) break;
                            }
                        }
                    }

                    const res = await pool.query(`
                        INSERT INTO app_registrations (id, client_id, display_name, app_id_uri, environment, product_id, api_id, type, updated_at)
                        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            app_id_uri = EXCLUDED.app_id_uri,
                            product_id = COALESCE(EXCLUDED.product_id, app_registrations.product_id),
                            api_id = COALESCE(EXCLUDED.api_id, app_registrations.api_id),
                            type = EXCLUDED.type,
                            updated_at = NOW()
                        RETURNING *;
                    `, [id, name, appIdUri, env, linkedProductId, linkedApiId, identityType]);

                    // Update parent table (Products or APIs) to link the identity back
                    if (linkedProductId) {
                        await pool.query(`
                            UPDATE products 
                            SET identity_client_id = $1, 
                                identity_display_name = $2, 
                                identity_app_id_uri = $3,
                                updated_at = NOW()
                            WHERE id = $4
                        `, [id, name, appIdUri, linkedProductId]);
                    } else if (linkedApiId) {
                        await pool.query(`
                            UPDATE apis 
                            SET identity_client_id = $1, 
                                identity_display_name = $2, 
                                identity_app_id_uri = $3,
                                updated_at = NOW()
                            WHERE id = $4
                        `, [id, name, appIdUri, linkedApiId]);
                    }

                    if (verbose) {
                        console.log(`      🔑 ${id.substring(0, 8)}... -> "${name}" (${env})`);
                    }
                }
            }
        }

        console.log(`🔌 Reconciling Backend inventory...`);
        for (const [env, backends] of Object.entries(apimMeta.backends || {})) {
            for (const b of backends) {
                await pool.query(`
                    INSERT INTO governance_backends (id, environment, url, description, title, protocol, scope, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (id, environment) DO UPDATE SET
                        url = EXCLUDED.url,
                        description = EXCLUDED.description,
                        title = EXCLUDED.title,
                        protocol = EXCLUDED.protocol,
                        scope = COALESCE(governance_backends.scope, EXCLUDED.scope),
                        updated_at = NOW();
                `, [b.id, env, b.url, b.description, b.title, b.protocol, 'GLOBAL']);
            }
        }

        // --- D. SUBSCRIPTIONS RECONCILIATION ---
        console.log(`🔑 Reconciling Subscriptions...`);
        for (const [env, subs] of Object.entries(apimMeta.subscriptions || {})) {
            if (!subs || subs.length === 0) continue;

            console.log(`   [${env}] Processing ${subs.length} subscriptions`);

            for (const sub of subs) {
                const subId = `${env}:${sub.id}`;
                const productId = `${sub.productId}:${env}:Global`; // Match products table format

                // Extract owner ID from APIM path (e.g., "/users/abc123" -> "abc123")
                const ownerMatch = sub.ownerId?.match(/\/users\/(.+)/);
                const ownerUserId = ownerMatch ? ownerMatch[1] : null;

                // Check if this is a default subscription (naming pattern: default_{productName})
                const isDefaultSubscription = sub.displayName?.startsWith('default_');

                // Start with NULL - only assign if team exists
                let subscriberTeamId: string | null = null;

                if (isDefaultSubscription) {
                    // For default subscriptions, try to auto-assign to product owner
                    const prodQuery = await pool.query('SELECT owner_team_id FROM products WHERE id = $1', [productId]);
                    if (prodQuery.rows.length > 0 && prodQuery.rows[0].owner_team_id) {
                        const potentialTeamId = prodQuery.rows[0].owner_team_id;

                        // Verify team exists in teams table
                        const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [potentialTeamId]);
                        if (teamCheck.rows.length > 0) {
                            subscriberTeamId = potentialTeamId;
                            if (verbose) {
                                console.log(`      ✅ Auto-assigned default subscription to product owner: ${subscriberTeamId}`);
                            }
                        } else if (verbose) {
                            console.log(`      ⚠️  Product owner team ${potentialTeamId} not found in teams table`);
                        }
                    }
                } else if (ownerUserId) {
                    // For non-default subscriptions, check if ownerUserId is a valid team
                    const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [ownerUserId]);
                    if (teamCheck.rows.length > 0) {
                        subscriberTeamId = ownerUserId;
                    } else if (verbose) {
                        console.log(`      ⚠️  Owner ${ownerUserId} not found in teams table - subscription will be orphaned`);
                    }
                }

                try {
                    await pool.query(`
                        INSERT INTO subscriptions (
                            id, product_id, subscriber_team_id, display_name, state,
                            created_at, expiration_date, updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            state = EXCLUDED.state,
                            display_name = EXCLUDED.display_name,
                            expiration_date = EXCLUDED.expiration_date,
                            updated_at = NOW();
                    `, [
                        subId,
                        productId,
                        subscriberTeamId, // Auto-assigned for default, NULL for others (orphaned)
                        sub.displayName,
                        sub.state,
                        sub.createdDate,
                        sub.expirationDate
                    ]);

                    if (!subscriberTeamId && !isDefaultSubscription && verbose) {
                        console.log(`      ⚠️  Orphaned subscription: ${sub.displayName} - needs admin assignment`);
                    }
                } catch (err: any) {
                    console.error(`❌ FAILED to sync Subscription: ${sub.id}`);
                    console.error(`   Details: ${err.message}`);
                }
            }
        }

        // Backends linked via APIs already handled in A.2 loop for better context

        console.log(`\n✅ Reconciliation Complete!`);
        console.log(`\n📊 Summary:`);
        const productCount = await pool.query(`SELECT COUNT(*) FROM products${targetEnv ? ` WHERE environment = '${targetEnv}'` : ''}`);
        const apiCount = await pool.query(`SELECT COUNT(*) FROM apis`);
        const terraformManaged = await pool.query(`SELECT COUNT(*) FROM products WHERE management_mode = 'TERRAFORM_MANAGED'${targetEnv ? ` AND environment = '${targetEnv}'` : ''}`);
        const untracked = await pool.query(`SELECT COUNT(*) FROM products WHERE management_mode = 'UNTRACKED'${targetEnv ? ` AND environment = '${targetEnv}'` : ''}`);

        console.log(`   Products: ${productCount.rows[0].count}`);
        console.log(`   APIs: ${apiCount.rows[0].count}`);
        console.log(`   🔧 Terraform-Managed: ${terraformManaged.rows[0].count}`);
        console.log(`   📦 Untracked: ${untracked.rows[0].count}`);

    } catch (e: any) {
        console.error(`\n❌ Reconciliation Failed:`, e.message);
    } finally {
        await pool.end();
    }
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
