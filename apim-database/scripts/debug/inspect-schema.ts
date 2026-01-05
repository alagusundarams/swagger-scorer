import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Database Schema Inspector
 * 
 * Inspects all main tables and displays their column definitions.
 */

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

async function inspectSchema() {
    const config = loadConfig();
    const connectionString = process.env.DATABASE_URL || config.database?.url;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment or config.json');
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString });

    const tables = [
        'products',
        'apis',
        'operations',
        'named_values',
        'governance_backends',
        'api_backends',
        'app_registrations',
        'subscriptions',
        'teams',
        'users',
        'policy_templates',
        'approval_requests',
        'audit_log'
    ];

    try {
        console.log('🔍 Database Schema Inspection\n');
        console.log(`📡 Connected to: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

        for (const table of tables) {
            console.log(`\n--- 📋 Table: ${table} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            if ((res.rowCount ?? 0) === 0) {
                console.error(`   ❌ Table ${table} NOT FOUND!`);
            } else {
                res.rows.forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const defaultVal = col.column_default || 'NONE';
                    console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable.padEnd(10)} Default: ${defaultVal}`);
                });
                console.log(`   📊 Total Columns: ${res.rowCount}`);
            }
        }

        console.log('\n✅ Schema inspection complete!');
    } catch (err) {
        console.error('\n❌ Schema inspection failed:', (err as Error).message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

inspectSchema();
