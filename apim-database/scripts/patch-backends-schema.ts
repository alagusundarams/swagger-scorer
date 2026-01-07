
import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json'),
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function patchSchema() {
    console.log('🔧 Patching governance_backends schema...');

    const pool = new Pool({ connectionString: DATABASE_URL });
    const query = (text: string) => pool.query(text);

    try {
        // 1. Add missing columns if they don't exist
        await query(`
            ALTER TABLE governance_backends 
            ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS api_id TEXT REFERENCES apis(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('PRODUCT', 'API', 'GLOBAL')),
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);
        console.log('✅ Added missing columns (product_id, api_id, scope, created_at)');

        // 2. Drop obsolete column if it exists
        // Note: We might want to keep it if data migration is needed, but given this is a dev environment fix
        // and resource_id was likely not used by current code, we can drop it to match god schema.
        await query(`
            ALTER TABLE governance_backends 
            DROP COLUMN IF EXISTS resource_id;
        `);
        console.log('✅ Dropped obsolete column (resource_id)');

        console.log('✨ Schema patch complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Patch Failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

patchSchema();
