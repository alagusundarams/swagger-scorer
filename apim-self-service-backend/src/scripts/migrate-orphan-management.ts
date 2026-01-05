import 'dotenv/config';
import { query } from '../services/db.js';

async function migrate() {
    console.log('🚀 Starting Migration: Orphan Management Expansion...');

    try {
        // 1. Update governance_backends
        console.log('📝 Updating governance_backends...');
        await query(`
            ALTER TABLE governance_backends 
            ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id),
            ADD COLUMN IF NOT EXISTS api_id TEXT REFERENCES apis(id),
            ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;
        `);
        console.log('✅ governance_backends updated');

        // 2. Update named_values
        console.log('📝 Updating named_values...');
        await query(`
            ALTER TABLE named_values 
            ADD COLUMN IF NOT EXISTS environment TEXT,
            ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;
        `);

        // Add a composite unique constraint
        try {
            await query(`
                ALTER TABLE named_values 
                ADD CONSTRAINT unique_nv_env_name UNIQUE (environment, system_name);
            `);
        } catch (e) {
            console.log('💡 Constraint unique_nv_env_name might already exist, skipping...');
        }

        // Backfill scope for named_values
        await query(`
            UPDATE named_values 
            SET scope = 'API' 
            WHERE scope_id IS NOT NULL AND scope IS NULL;
        `);
        await query(`
            UPDATE named_values 
            SET scope = 'PRODUCT' 
            WHERE scope_id IS NULL AND product_id IS NOT NULL AND scope IS NULL;
        `);

        console.log('✅ named_values updated');

        console.log('🏁 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

migrate();
