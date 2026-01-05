/**
 * @fileoverview Database Patch - Orphan Management Expansion
 * 
 * Adds productId, apiId, and scope to backends and environment/scope to named_values.
 * Run: npx tsx apim-database/scripts/patch-orphan-management.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadConfig() {
    const configPath = join(process.cwd(), 'apim-database', 'config.json');
    if (existsSync(configPath)) return JSON.parse(readFileSync(configPath, 'utf8'));
    return {};
}

const config = loadConfig();
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function patch() {
    console.log('🚀 Starting Database Patch: Orphan Management...');
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        // 1. Update governance_backends
        console.log('📝 Updating governance_backends...');
        await pool.query(`
            ALTER TABLE governance_backends 
            ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id),
            ADD COLUMN IF NOT EXISTS api_id TEXT REFERENCES apis(id),
            ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;
        `);
        console.log('✅ governance_backends updated');

        // 2. Update named_values (Core Inventory)
        console.log('📝 Updating named_values...');
        await pool.query(`
            ALTER TABLE named_values 
            ADD COLUMN IF NOT EXISTS environment TEXT,
            ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;
        `);

        // Add a composite unique constraint
        try {
            await pool.query(`
                ALTER TABLE named_values 
                ADD CONSTRAINT unique_nv_env_name UNIQUE (environment, system_name);
            `);
        } catch (e) {
            console.log('💡 Constraint unique_nv_env_name might already exist, skipping...');
        }

        // Backfill scope for named_values
        await pool.query(`
            UPDATE named_values 
            SET scope = 'API' 
            WHERE scope_id IS NOT NULL AND scope IS NULL;
        `);
        await pool.query(`
            UPDATE named_values 
            SET scope = 'PRODUCT' 
            WHERE scope_id IS NULL AND product_id IS NOT NULL AND scope IS NULL;
        `);

        console.log('✅ named_values updated');
        console.log('🏁 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

patch();
