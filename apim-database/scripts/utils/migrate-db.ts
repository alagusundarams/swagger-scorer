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

        // Add `github_url` if not exists
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS github_url TEXT;
        `);
        console.log("✅ Added 'github_url' column.");

        // Add `terraform_pipeline_url` if not exists (Note: schema says it accepts it, but verifying)
        // Actually, looking at 01-schema.sql, `terraform_pipeline_url` WAS there line 87. 
        // But `github_url` was missing? Or incorrectly named?
        // Wait, line 90 says `git_repo_url TEXT`. 
        // The sync script uses `github_url`. We should ALIAS or ADD it.
        // Let's add `terraform_pipeline_url` explicitly just in case.

        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS terraform_pipeline_url TEXT;
        `);
        console.log("✅ Added 'terraform_pipeline_url' column.");

        console.log("🚀 Migration Complete.");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
