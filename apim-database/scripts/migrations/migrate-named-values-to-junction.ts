/**
 * Migration: Move Product-Named Value Relationships to Junction Table
 * 
 * Migrates existing named_values.product_id relationships into the new
 * product_named_values junction table to support shared resource model.
 */

import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load config
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || config.database?.url,
        ...(typeof config.database === 'object' ? config.database : {})
    });

    try {
        console.log('🔄 Migrating named values to junction table...\n');

        //1. Migrate existing product_id relationships to junction table
        const result = await pool.query(`
            INSERT INTO product_named_values (product_id, named_value_id, is_owner, can_modify)
            SELECT 
                product_id, 
                id, 
                true AS is_owner,      -- Existing links are owners
                true AS can_modify      -- Owners can modify
            FROM named_values
            WHERE product_id IS NOT NULL
            ON CONFLICT (product_id, named_value_id) DO NOTHING
        `);

        console.log(`✅ Migrated ${result.rowCount ?? 0} product-named value relationships`);

        // 2. Get stats
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_links,
                COUNT(DISTINCT product_id) as products_with_nvs,
                COUNT(DISTINCT named_value_id) as named_values_linked
            FROM product_named_values
        `);

        console.log('\n📊 Junction Table Stats:');
        console.log(`   Total Links: ${stats.rows[0].total_links}`);
        console.log(`   Products: ${stats.rows[0].products_with_nvs}`);
        console.log(`   Named Values: ${stats.rows[0].named_values_linked}`);

        // 3. Check for orphaned named values
        const orphans = await pool.query(`
            SELECT COUNT(*) as orphan_count
            FROM named_values nv
            LEFT JOIN product_named_values pnv ON nv.id = pnv.named_value_id
            WHERE pnv.product_id IS NULL
        `);

        if (orphans.rows[0].orphan_count > 0) {
            console.log(`\n⚠️  Found ${orphans.rows[0].orphan_count} orphaned named values (no product association)`);
            console.log('   These will need to be assigned via admin UI or next reconciliation');
        }

        console.log('\n✅ Migration complete!');

    } catch (err: any) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
