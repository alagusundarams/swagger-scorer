/**
 * APIM to PostgreSQL Migration Script
 * 
 * Transforms APIM data and loads it into PostgreSQL
 * 
 * Prerequisites:
 * 1. PostgreSQL database created
 * 2. Schema applied (database/schema.sql)
 * 3. APIM data fetched (scripts/fetch-apim-data.ts)
 * 
 * Usage:
 * DATABASE_URL=postgresql://user:pass@localhost:5432/apim npx tsx scripts/migrate-to-postgres.ts data/apim-data-2024-12-19.json
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import axios from 'axios';

// For calling the scoring API
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface APIMData {
    fetchedAt: string;
    instance: string;
    environment: string;
    summary: {
        totalProducts: number;
        totalAPIs: number;
        totalSubscriptions: number;
    };
    products: any[];
    apis: any[];
    subscriptions: any[];
}

function createDbPool(): Pool {
    let connectionString = process.env.DATABASE_URL;

    // Fallback to config.json with priority-based discovery
    if (!connectionString) {
        const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
        const localConfig = join(process.cwd(), 'config.json');
        const relativeConfig = join(__dirname, '..', 'config.json');

        let configPath = '';
        if (existsSync(rootConfig)) configPath = rootConfig;
        else if (existsSync(localConfig)) configPath = localConfig;
        else if (existsSync(relativeConfig)) configPath = relativeConfig;

        if (configPath) {
            console.log(`📂 Using config from: ${configPath}`);
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            connectionString = config.database?.url;
        }
    }

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable or database.url in config.json is required');
    }

    return new Pool({ connectionString });
}

/**
 * Create a default team for products without team assignment
 */
async function createDefaultTeam(pool: Pool): Promise<string> {
    const teamId = 'default-team';

    await pool.query(`
        INSERT INTO teams (id, name, type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
    `, [teamId, 'Default Team', 'producer', 'Default team for migrated products']);

    return teamId;
}

/**
 * Robust Environment Mapping to satisfy DB Constraints
 */
function mapEnv(env: string): string {
    const e = env.toUpperCase();
    if (e.includes('PROD')) return 'PROD';
    if (e.includes('STG') || e.includes('STAGE')) return 'STAGE';
    if (e.includes('QA') || e.includes('TEST')) return 'QA';
    if (e.includes('DEV')) return 'DEV';
    return 'DEV'; // Fallback to DEV
}

/**
 * Call the backend scoring API to get quality score for a product
 */
async function getQualityScore(productId: string, repoUrl?: string): Promise<number | null> {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/v1/analyze`, {
            productId,
            repoUrl
        }, {
            timeout: 10000 // 10 second timeout
        });

        return response.data?.qualityScore || null;
    } catch (error: any) {
        console.warn(`⚠️  Could not fetch quality score for ${productId}: ${error.message}`);
        return null;
    }
}

/**
 * Extract version from product name or default to 1.0.0
 */
function extractVersion(productName: string): string {
    // Try to extract version patterns like v1, v2.0, v1.2.3, etc.
    const versionMatch = productName.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
    if (versionMatch) {
        const major = versionMatch[1] || '1';
        const minor = versionMatch[2] || '0';
        const patch = versionMatch[3] || '0';
        return `${major}.${minor}.${patch}`;
    }
    return '1.0.0';
}

/**
 * Migrate products - properly structured
 */
async function migrateProducts(pool: Pool, products: any[], importEnv: string) {
    const targetEnv = mapEnv(importEnv);
    console.log(`\n📦 Migrating ${products.length} products to ${targetEnv} (Source: ${importEnv})...`);
    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
        try {
            const props = product.properties || {};
            const name = product.name || 'unnamed-product';
            const environment = targetEnv;

            const gitRepoUrl = environment === 'PROD'
                ? process.env.GIT_PROD_REPO_URL || process.env.GIT_REPO_URL || null
                : process.env.GIT_REPO_URL || null;

            const productType = product.type === 'grp' ? 'grp' : 'standard';
            const productId = `${targetEnv}-${name}`.toLowerCase();

            const createdAt = product.properties?.createdDate || product.createdDate || new Date().toISOString();
            const updatedAt = product.properties?.lastModifiedDate || product.updatedDate || createdAt;

            // Extract version from product name (Azure APIM products don't have native version field)
            const version = extractVersion(name);
            console.log(`  📝 Product "${name}" → version ${version}`);

            // Quality scores will be calculated by background job
            const qualityScore = null;

            console.log(`  💾 Inserting product: ${productId}`);

            await pool.query(`
                INSERT INTO products (
                    id, name, display_name, version, description, state, type,
                    owner_team_id, environment, visibility, management_mode,
                    git_repo_url, git_file_path, terraform_pipeline_url, last_deployed_commit_hash,
                    subscriber_count, quality_score, apim_raw_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            `, [
                productId,
                name,
                props.displayName || name,
                version,
                props.description || '',
                props.state === 'published' ? 'published' : 'notPublished',
                productType,
                null,
                targetEnv,
                'internal',
                'TERRAFORM_MANAGED',
                product.gitInfo?.repoUrl || gitRepoUrl,
                `contracts/${name}/openapi.yaml`,
                product.pipelineInfo?.url || null,
                product.gitInfo?.lastCommit || null,
                0,
                qualityScore,
                JSON.stringify(product),
                createdAt,
                updatedAt
            ]);

            console.log(`  ✅ Successfully inserted ${productId}`);
            inserted++;
        } catch (err) {
            console.error(`  ❌ Failed to migrate product ${product.name}:`, err instanceof Error ? err.message : String(err));
            skipped++;
        }
    }

    console.log(`✅ Finished product migration: ${inserted} inserted, ${skipped} skipped.`);

    const res = await pool.query('SELECT id, name FROM products WHERE environment = $1', [targetEnv]);
    return new Map<string, string>(res.rows.map((r: any) => [r.name.toLowerCase(), r.id]));
}

/**
 * Transform and insert APIs
 */
async function migrateAPIs(pool: Pool, apis: any[], products: any[], importEnv: string) {
    const targetEnv = mapEnv(importEnv);
    console.log(`\n🔌 Migrating ${apis.length} APIs to ${targetEnv}...`);
    let inserted = 0;
    let skipped = 0;

    const productMap = new Map<string, string>();
    products.forEach(p => {
        const name = p.name || 'unnamed';
        productMap.set(name.toLowerCase(), `${targetEnv}-${name}`.toLowerCase());
    });

    for (const api of apis) {
        try {
            const props = api.properties;

            // Try to find parent product - improved matching logic
            let productId = null;
            const apiName = api.name || 'unnamed-api';
            const apiPath = props.path || '/';

            // Strategy 1: Exact name match (case-insensitive)
            for (const [productName, prodId] of Array.from(productMap.entries())) {
                if (apiName.toLowerCase() === productName.toLowerCase()) {
                    productId = prodId;
                    break;
                }
            }

            // Strategy 2: API name starts with product name (e.g., payment-api-v2 → payment)
            if (!productId) {
                for (const [productName, prodId] of Array.from(productMap.entries())) {
                    if (apiName.toLowerCase().startsWith(productName.toLowerCase() + '-') ||
                        apiName.toLowerCase().startsWith(productName.toLowerCase() + '_')) {
                        productId = prodId;
                        break;
                    }
                }
            }

            // Strategy 3: Fallback to default product for environment
            if (!productId && products.length > 0) {
                const fallbackName = products[0].name || 'unnamed';
                productId = `${targetEnv}-${fallbackName}`.toLowerCase();
            }

            if (!productId) {
                console.warn(`  ⚠️  No product found for API ${apiName}, skipping`);
                skipped++;
                continue;
            }

            // Debug: log the product_id we're about to use
            console.log(`  🔍 API "${apiName}" → product_id: "${productId}"`);

            // Extract Git info if available
            const gitRepoUrl = (api as any).gitInfo?.repoUrl || null;
            const gitFilePath = (api as any).gitInfo?.filePath || 'openapi.yaml';
            const apiId = `${targetEnv}-${api.id || apiName}`.toLowerCase();

            console.log(`  💾 Inserting API: ${apiName}`);
            await pool.query(`
                INSERT INTO apis (
                    id, product_id, origin_team_id, name, display_name, description, path,
                    service_url, protocols, subscription_required, git_repo_url, git_file_path,
                    apim_raw_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    product_id = EXCLUDED.product_id,
                    name = EXCLUDED.name,
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    path = EXCLUDED.path,
                    service_url = EXCLUDED.service_url,
                    protocols = EXCLUDED.protocols,
                    subscription_required = EXCLUDED.subscription_required,
                    git_repo_url = EXCLUDED.git_repo_url,
                    git_file_path = EXCLUDED.git_file_path,
                    updated_at = NOW()
            `, [
                apiId,
                productId,
                null, // origin_team_id populated later by admin mapping
                apiName,
                props.displayName || apiName,
                props.description || null,
                apiPath,
                props.serviceUrl || null,
                props.protocols ? props.protocols.join(',') : 'https',
                props.subscriptionRequired !== false,
                gitRepoUrl,
                gitFilePath,
                JSON.stringify(api)
            ]);

            inserted++;
        } catch (error) {
            console.error(`  ❌ Failed to migrate API ${api.name}:`, error);
            skipped++;
        }
    }

    console.log(`✅ Finished API migration: ${inserted} inserted, ${skipped} skipped.`);
}

/**
 * Transform and insert subscriptions
 */
async function migrateSubscriptions(pool: Pool, subscriptions: any[], importEnv: string, productRegistry?: Map<string, string>) {
    const targetEnv = mapEnv(importEnv);
    console.log(`\n🔑 Migrating ${subscriptions.length} subscriptions to ${targetEnv}...`);
    let inserted = 0;
    let skipped = 0;

    for (const sub of subscriptions) {
        try {
            const props = sub.properties || {};
            const scope = props.scope || '';
            const scopeMatch = scope.match(/\/products\/([^\/\s]+)/);
            const apimProductId = scopeMatch ? scopeMatch[1] : null;

            if (!apimProductId) {
                skipped++;
                continue;
            }

            // Robust Lookup: Use registry first, fallback to construction
            let productId = productRegistry?.get(apimProductId.toLowerCase());

            if (!productId) {
                productId = `${targetEnv}-${apimProductId}`.toLowerCase();
            }

            // ⚠️ Final Verification: Check if product actually exists
            const prodCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
            if (prodCheck.rowCount === 0) {
                // One last try: Check if we have it by name (Case-insensitive)
                const fuzzyCheck = await pool.query('SELECT id FROM products WHERE name ILIKE $1 AND environment = $2', [apimProductId, targetEnv]);
                if (fuzzyCheck.rowCount && fuzzyCheck.rowCount > 0) {
                    productId = fuzzyCheck.rows[0].id;
                } else {
                    console.warn(`  ⚠️  Skipping subscription ${sub.name}: Product ID '${productId}' or Name '${apimProductId}' not found in database.`);
                    skipped++;
                    continue;
                }
            }

            await pool.query(`
                INSERT INTO subscriptions (
                    id, product_id, subscriber_team_id, state,
                    primary_key_name, primary_key_value,
                    secondary_key_name, secondary_key_value,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    state = EXCLUDED.state,
                    updated_at = NOW()
            `, [
                `${targetEnv}-${sub.id || sub.name}`.toLowerCase(),
                productId,
                'default-team',
                props.state === 'active' ? 'active' : 'suspended',
                'primary', 'redacted-sync',
                'secondary', 'redacted-sync',
                props.createdDate || new Date().toISOString()
            ]);

            inserted++;
        } catch (error: any) {
            console.error(`  ❌ FK Constraint Failure on sub ${sub.name}: ${error.message}`);
            skipped++;
        }
    }

    console.log(`✅ Finished subscription migration: ${inserted} inserted, ${skipped} skipped.`);
}

/**
 * Update product statistics
 */
async function updateProductStats(pool: Pool) {
    console.log('\n📊 Updating product statistics...');
    await pool.query(`
        UPDATE products p
        SET subscriber_count = (
            SELECT COUNT(*) FROM subscriptions s WHERE s.product_id = p.id
        )
    `);
    console.log('✅ Product statistics updated.');
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    let filesToProcess: string[] = [];

    // Priority data directory discovery
    const rootData = join(process.cwd(), 'apim-database', 'data');
    const localData = join(process.cwd(), 'data');
    const relativeData = join(__dirname, '..', 'data');

    let dataDir = '';
    if (existsSync(rootData)) dataDir = rootData;
    else if (existsSync(localData)) dataDir = localData;
    else if (existsSync(relativeData)) dataDir = relativeData;

    if (args.length > 0) {
        const target = args[0];
        if (existsSync(target) && statSync(target).isDirectory()) {
            filesToProcess = readdirSync(target)
                .filter(f => f.startsWith('apim-data-') && f.endsWith('.json'))
                .map(f => join(target, f));
        } else if (existsSync(target)) {
            filesToProcess = [target];
        }
    } else if (existsSync(dataDir)) {
        filesToProcess = readdirSync(dataDir)
            .filter(f => f.startsWith('apim-data-') && f.endsWith('.json'))
            .map(f => join(dataDir, f));
    }

    if (filesToProcess.length === 0) {
        console.error('❌ Error: No APIM JSON data files found.');
        console.log('Either provide a file path or ensure files exist in apim-database/data/');
        process.exit(1);
    }

    console.log(`🚀 Found ${filesToProcess.length} snapshots to migrate.`);
    const pool = createDbPool();

    try {
        // Clear all existing data to prevent foreign key conflicts
        console.log('\n🧹 Clearing existing data...');
        await pool.query('TRUNCATE TABLE subscriptions, apis, products, teams CASCADE');
        console.log('✅ Existing data cleared');

        await createDefaultTeam(pool);

        for (const dataPath of filesToProcess) {
            console.log(`\n--- Processing: ${dataPath} ---`);
            const data = JSON.parse(readFileSync(dataPath, 'utf8')) as APIMData;

            const registry = await migrateProducts(pool, data.products, data.environment);
            await migrateAPIs(pool, data.apis, data.products, data.environment);
            await migrateSubscriptions(pool, data.subscriptions, data.environment, registry);
        }

        await updateProductStats(pool);
        console.log(`\n✨ Batch migration complete!`);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

main();
