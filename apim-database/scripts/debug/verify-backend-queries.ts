import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Load environment variables
const envPath = resolve(process.cwd(), '.env');
const apimEnvPath = resolve(process.cwd(), 'apim-database', '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });
else if (existsSync(apimEnvPath)) dotenv.config({ path: apimEnvPath });

async function verifyQueries() {
    console.log('🔍 Starting Backend Query Verification...');

    // 1. Connection setup
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        const configPaths = [
            join(process.cwd(), 'apim-self-service-backend', 'config.json'),
            join(process.cwd(), '..', 'apim-self-service-backend', 'config.json'),
            join(process.cwd(), 'config.json')
        ];
        for (const p of configPaths) {
            if (existsSync(p)) {
                const config = JSON.parse(readFileSync(p, 'utf8'));
                connectionString = config.database?.url;
                if (connectionString) break;
            }
        }
    }

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in .env or config.json');
        process.exit(1);
    }

    console.log(`📡 Connecting to database (masked): ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
    const pool = new pg.Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    try {
        // Query 1: All Products (Primary Catalog View)
        console.log('\n--- [1/4] Testing getAllProducts ---');
        const productRes = await pool.query(`
            SELECT p.*, 
                   t.name as owner_team_name,
                   p.dev_hash, p.qa_hash, p.stage_hash, p.production_hash as prod_hash,
                   COALESCE(sub_counts.active_subscribers, 0) as calculated_subscriber_count
            FROM products p
            LEFT JOIN teams t ON p.owner_team_id = t.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as active_subscribers
                FROM subscriptions
                WHERE subscriptions.product_id = p.id
                AND subscriptions.state = 'active'
            ) sub_counts ON true
            ORDER BY p.display_name ASC
            LIMIT 5
        `);
        console.log(`✅ Success! Found ${productRes.rowCount ?? 0} products.`);
        if ((productRes.rowCount ?? 0) > 0) {
            console.log('Sample Row (first 2):');
            console.table(productRes.rows.slice(0, 2).map(r => ({
                id: r.id,
                name: r.name,
                env: r.environment,
                prod_hash: r.prod_hash
            })));
        }

        // Query 2: All APIs
        console.log('\n--- [2/4] Testing getAllApis ---');
        const apiRes = await pool.query(`
            SELECT a.*, o.json_data as operations_json
            FROM apis a
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
            LIMIT 5
        `);
        console.log(`✅ Success! Found ${apiRes.rowCount} APIs.`);

        // Query 3: Named Values (Environment Context)
        console.log('\n--- [3/4] Testing Named Values (with Environment/Region) ---');
        const nvRes = await pool.query(`
            SELECT nv.id, nv.system_name, nv.environment, nv.region, nv.product_id
            FROM named_values nv
            LIMIT 5
        `);
        console.log(`✅ Success! Found ${nvRes.rowCount ?? 0} named values.`);
        if ((nvRes.rowCount ?? 0) > 0) {
            console.table(nvRes.rows);
        }

        // Query 4: Governance Backends
        console.log('\n--- [4/4] Testing Governance Backends ---');
        const backendRes = await pool.query(`
            SELECT id, product_id, environment, region, url
            FROM governance_backends
            LIMIT 5
        `);
        console.log(`✅ Success! Found ${backendRes.rowCount ?? 0} backends.`);
        if ((backendRes.rowCount ?? 0) > 0) {
            console.table(backendRes.rows);
        }

        console.log('\n🎉 All core backend queries verified successfully!');

    } catch (err) {
        console.error('\n❌ Verification Failed:', (err as Error).message);
        if ((err as Error).stack) console.error((err as Error).stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyQueries();
