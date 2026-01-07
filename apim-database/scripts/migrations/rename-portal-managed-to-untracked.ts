/**
 * Migration Script: Rename PORTAL_MANAGED to UNTRACKED
 * 
 * Updates all existing products in the database to use the new UNTRACKED terminology
 * instead of PORTAL_MANAGED for better semantic clarity.
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
        console.log('🔄 Starting migration: PORTAL_MANAGED → UNTRACKED\n');

        // Check current state
        const before = await pool.query(`
            SELECT management_mode, COUNT(*) as count 
            FROM products 
            GROUP BY management_mode
        `);

        console.log('📊 Current state:');
        before.rows.forEach(row => {
            console.log(`   ${row.management_mode}: ${row.count}`);
        });

        // Perform migration
        const result = await pool.query(`
            UPDATE products 
            SET management_mode = 'UNTRACKED' 
            WHERE management_mode = 'PORTAL_MANAGED'
            RETURNING id, name, environment
        `);

        console.log(`\n✅ Updated ${result.rowCount ?? 0} products\n`);

        if ((result.rowCount ?? 0) > 0) {
            console.log('Sample of updated products:');
            result.rows.slice(0, 5).forEach(row => {
                console.log(`   • ${row.name} (${row.environment})`);
            });
            if ((result.rowCount ?? 0) > 5) {
                console.log(`   ... and ${(result.rowCount ?? 0) - 5} more`);
            }
        }

        // Check final state
        const after = await pool.query(`
            SELECT management_mode, COUNT(*) as count 
            FROM products 
            GROUP BY management_mode
        `);

        console.log('\n📊 Final state:');
        after.rows.forEach(row => {
            console.log(`   ${row.management_mode}: ${row.count}`);
        });

        console.log('\n✅ Migration complete!');

    } catch (err: any) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
