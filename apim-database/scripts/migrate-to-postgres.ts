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

import { readFileSync } from 'fs';
import pg from 'pg';
const { Pool } = pg;

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

/**
 * Initialize database connection
 */
function createDbPool(): pg.Pool {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    return new Pool({ connectionString });
}

/**
 * Create a default team for products without team assignment
 */
async function createDefaultTeam(pool: pg.Pool): Promise<string> {
    const teamId = 'default-team';

    await pool.query(`
        INSERT INTO teams (id, name, type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
    `, [teamId, 'Default Team', 'producer', 'Default team for migrated products']);

    return teamId;
}

/**
 * Transform and insert products
 */
async function migrateProducts(pool: pg.Pool, products: any[], importEnv: string) {
    console.log(`\n📦 Migrating ${products.length} products to ${importEnv}...`);
    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
        try {
            // Extract product properties
            const props = product.properties;

            // Determine environment from product name or default to DEV
            let environment = 'DEV';
            const nameLower = product.name.toLowerCase();
            if (nameLower.includes('prod')) environment = 'PROD';
            else if (nameLower.includes('qa') || nameLower.includes('test')) environment = 'QA';
            else if (nameLower.includes('stage') || nameLower.includes('stg')) environment = 'STAGE';

            // Set Git repo (DEV/QA/STAGE use same repo, PROD might be different)
            const gitRepoUrl = environment === 'PROD'
                ? process.env.GIT_PROD_REPO_URL || process.env.GIT_REPO_URL || null
                : process.env.GIT_REPO_URL || null;

            await pool.query(`
                INSERT INTO products (
                    id, name, display_name, version, description, state,
                    owner_team_id, environment, visibility, management_mode,
                    git_repo_url, git_file_path, terraform_pipeline_url, last_deployed_commit_hash,
                    subscriber_count, apim_raw_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    subscriber_count = EXCLUDED.subscriber_count,
                    updated_at = NOW()
            `, [
                `${importEnv}-${product.id || product.name}`,
                product.name,
                props.displayName || product.name,
                '1.0.0', // Default version
                props.description || '',
                props.state === 'published' ? 'published' : 'notPublished',
                null, // owner_team_id = NULL (no teams yet)
                importEnv,
                'internal', // Default visibility
                'TERRAFORM_MANAGED', // All existing products start as Terraform-managed
                product.gitInfo?.repoUrl || gitRepoUrl,
                `contracts/${product.name}/openapi.yaml`, // Default path guess
                product.pipelineInfo?.url || null,
                product.gitInfo?.lastCommit || null,
                0, // Will update from subscriptions
                JSON.stringify(product)
            ]);

            inserted++;
        } catch (error) {
            console.error(`  ❌ Failed to migrate product ${product.name}:`, error);
            skipped++;
        }
    }

    console.log(`  ✅ Inserted/Updated: ${inserted}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
}

/**
 * Transform and insert APIs
 */
async function migrateAPIs(pool: pg.Pool, apis: any[], products: any[], importEnv: string) {
    console.log(`\n📡 Migrating ${apis.length} APIs for ${importEnv}...`);
    let inserted = 0;
    let skipped = 0;

    // Create a map of product names to IDs
    const productMap = new Map(products.map(p => [p.name, `${importEnv}-${p.id || p.name}`]));

    for (const api of apis) {
        try {
            const props = api.properties;

            // Try to find parent product from API name/path
            // APIM API names often include product name
            let productId = null;
            for (const [productName, prodId] of productMap.entries()) {
                if (api.name.toLowerCase().includes(productName.toLowerCase()) ||
                    props.path?.includes(productName.toLowerCase())) {
                    productId = prodId;
                    break;
                }
            }

            // If no product found, use first product as fallback (with prefix)
            if (!productId && products.length > 0) {
                productId = `${importEnv}-${products[0].id || products[0].name}`;
            }

            if (!productId) {
                console.warn(`  ⚠️  No product found for API ${api.name}, skipping`);
                skipped++;
                continue;
            }

            await pool.query(`
                INSERT INTO apis (
                    id, product_id, name, display_name, description, path,
                    apim_raw_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    path = EXCLUDED.path,
                    updated_at = NOW()
            `, [
                `${importEnv}-${api.id || api.name}`,
                productId,
                api.name,
                props.displayName || api.name,
                props.description || '',
                props.path || '/',
                JSON.stringify(api)
            ]);

            inserted++;
        } catch (error) {
            console.error(`  ❌ Failed to migrate API ${api.name}:`, error);
            skipped++;
        }
    }

    console.log(`  ✅ Inserted/Updated: ${inserted}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
}

/**
 * Transform and insert subscriptions
 */
async function migrateSubscriptions(pool: pg.Pool, subscriptions: any[], products: any[], defaultTeamId: string, importEnv: string) {
    console.log(`\n🔑 Migrating ${subscriptions.length} subscriptions for ${importEnv}...`);
    let inserted = 0;
    let skipped = 0;

    // For API-scoped subscriptions, we need to know which product an API belongs to
    const apiToProductRes = await pool.query('SELECT name, product_id FROM apis');
    const apiToProductMap = new Map(apiToProductRes.rows.map(r => [r.name.toLowerCase(), r.product_id]));

    const productMap = new Map(products.map(p => [p.name.toLowerCase(), `${importEnv}-${p.id || p.name}`]));

    for (const subscription of subscriptions) {
        try {
            const props = subscription.properties;

            // Extract product ID from scope
            // Scope format: /products/{productName} or /apis/{apiId}
            let productId = null;
            if (props.scope) {
                const scopeParts = props.scope.split('/');

                // 1. Try Product Match
                const productIdx = scopeParts.indexOf('products');
                if (productIdx >= 0 && scopeParts[productIdx + 1]) {
                    const productName = scopeParts[productIdx + 1].toLowerCase();
                    productId = productMap.get(productName);
                }

                // 2. Try API Match (fallback)
                if (!productId) {
                    const apiIdx = scopeParts.indexOf('apis');
                    if (apiIdx >= 0 && scopeParts[apiIdx + 1]) {
                        const apiName = scopeParts[apiIdx + 1].toLowerCase();
                        productId = apiToProductMap.get(apiName);
                    }
                }
            }

            if (!productId) {
                if (props.scope === '/' || !props.scope) {
                    console.warn(`  ℹ️  Service-level subscription skipped (No specific product): ${subscription.name}`);
                } else {
                    console.warn(`  ⚠️  Unmatched scope for subscription ${subscription.name}: ${props.scope}`);
                }
                skipped++;
                continue;
            }

            await pool.query(`
                INSERT INTO subscriptions (
                    id, product_id, subscriber_team_id, state,
                    primary_key_name, secondary_key_name,
                    apim_raw_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    state = EXCLUDED.state,
                    updated_at = NOW()
            `, [
                subscription.id || subscription.name,
                productId,
                defaultTeamId, // Assign to default team for now
                props.state || 'active',
                'primary',
                'secondary',
                JSON.stringify(subscription),
                props.createdDate || new Date().toISOString()
            ]);

            inserted++;
        } catch (error) {
            console.error(`  ❌ Failed to migrate subscription ${subscription.name}:`, error);
            skipped++;
        }
    }

    console.log(`  ✅ Inserted/Updated: ${inserted}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
}

/**
 * Update product subscriber counts
 */
async function updateProductStats(pool: pg.Pool) {
    console.log('\n📊 Updating product statistics...');

    await pool.query(`
        UPDATE products p
        SET subscriber_count = (
            SELECT COUNT(*) 
            FROM subscriptions s 
            WHERE s.product_id = p.id AND s.state = 'active'
        )
    `);

    console.log('  ✅ Product stats updated');
}

/**
 * Main migration
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Usage: npx tsx scripts/migrate-to-postgres.ts <path-to-apim-data.json>');
        console.error('Example: npx tsx scripts/migrate-to-postgres.ts data/apim-data-2024-12-19.json');
        process.exit(1);
    }

    const dataFilePath = args[0];

    console.log('🔄 APIM to PostgreSQL Migration');
    console.log('='.repeat(50));

    // Load APIM data
    console.log(`\n📂 Loading data from: ${dataFilePath}`);
    const apimData: APIMData = JSON.parse(readFileSync(dataFilePath, 'utf-8'));

    console.log(`  ✅ Loaded data from ${apimData.instance}`);
    console.log(`  📊 Summary:`);
    console.log(`     - Products: ${apimData.products.length}`);
    console.log(`     - APIs: ${apimData.apis.length}`);
    console.log(`     - Subscriptions: ${apimData.subscriptions.length}`);

    // Connect to database
    console.log('\n🔌 Connecting to PostgreSQL...');
    const pool = createDbPool();

    try {
        await pool.query('SELECT NOW()');
        console.log('  ✅ Connected successfully');

        // Create default team
        console.log('\n👥 Setting up default team...');
        const defaultTeamId = await createDefaultTeam(pool);
        console.log(`  ✅ Default team ready: ${defaultTeamId}`);

        // Migrate data
        const importEnv = apimData.environment || 'DEV';
        await migrateProducts(pool, apimData.products, importEnv);
        await migrateAPIs(pool, apimData.apis, apimData.products, importEnv);
        await migrateSubscriptions(pool, apimData.subscriptions, apimData.products, defaultTeamId, importEnv);

        // Update stats
        await updateProductStats(pool);

        console.log('\n✅ Migration complete!');
        console.log('\nNext steps:');
        console.log('1. Review migrated data: SELECT * FROM products_with_teams;');
        console.log('2. Assign products to actual teams');
        console.log('3. Update backend to read from PostgreSQL');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
