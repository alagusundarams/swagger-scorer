import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load Config for Connection String
const configPath = join(process.cwd(), 'apim-database', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

// Use the first environment by default if not specified
const envConfig = config.azure.environments[0];
const connectionString = envConfig.databaseUrl; // Or construct from parts if needed

if (!connectionString) {
    console.error("❌ No databaseUrl found in config.json. Please ensure it's set.");
    process.exit(1);
}

const pool = new Pool({ connectionString });

async function inspect() {
    try {
        console.log(`🔍 Connecting to DB (${envConfig.name})...\n`);

        // 1. Inspect Products (detected_anomalies is JSONB or JSON-stored-as-text?)
        console.log('📦 --- LATEST 3 PRODUCTS ---');
        const prods = await pool.query(`
            SELECT id, name, management_mode, detected_anomalies 
            FROM products 
            ORDER BY updated_at DESC 
            LIMIT 3
        `);

        prods.rows.forEach(p => {
            console.log(`\nProduct: ${p.id}`);
            console.log(`  Name: ${p.name}`);
            console.log(`  Mode: ${p.management_mode}`);
            console.log(`  Anomalies (JSONB):`, JSON.stringify(p.detected_anomalies, null, 2));
        });

        // 2. Inspect APIs (apim_raw_data is probably JSONB)
        console.log('\n🔌 --- LATEST 3 APIs ---');
        const apis = await pool.query(`
            SELECT id, display_name, apim_raw_data 
            FROM apis 
            ORDER BY updated_at DESC 
            LIMIT 3
        `);

        apis.rows.forEach(a => {
            console.log(`\nAPI: ${a.id}`);
            console.log(`  Display: ${a.display_name}`);
            // If it's stored as text, we parse it. If it's actual JSONB column, it comes as object.
            let raw = a.apim_raw_data;
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch (e) { }
            }
            console.log(`  Raw Data (Snippet):`, JSON.stringify(raw, null, 2).slice(0, 500) + '...');
        });

    } catch (err) {
        console.error("❌ Error querying DB:", err);
    } finally {
        await pool.end();
    }
}

inspect();
