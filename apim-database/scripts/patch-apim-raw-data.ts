
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function patchSchema() {
    console.log('🔌 Connecting to database...');
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    try {
        console.log('🔍 Checking/Patching schema for apim_raw_data...');

        // 1. Patch governance_backends
        await client.query(`
            ALTER TABLE governance_backends 
            ADD COLUMN IF NOT EXISTS apim_raw_data JSONB;
        `);
        console.log('✅ governance_backends patched.');

        // 2. Patch named_values
        await client.query(`
            ALTER TABLE named_values 
            ADD COLUMN IF NOT EXISTS apim_raw_data JSONB;
        `);
        console.log('✅ named_values patched.');

    } catch (err: any) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
        console.log('👋 Done.');
    }
}

patchSchema();
