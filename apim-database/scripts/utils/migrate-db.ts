import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load Config
const configPath = join(process.cwd(), 'apim-database', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const envConfig = config.azure.environments[0]; // Default to first env or use specific one if passed args

if (!envConfig.databaseUrl) {
    console.error("❌ No databaseUrl found in config.json.");
    process.exit(1);
}

const pool = new Pool({ connectionString: envConfig.databaseUrl });

async function migrate() {
    try {
        console.log(`🔄 Starting Schema Migration on ${envConfig.databaseUrl}...`);

        // Rename/Add pipeline_url if not exists
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS pipeline_url TEXT;
        `);
        console.log("✅ Added 'pipeline_url' column.");

        console.log("🚀 Migration Complete.");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
