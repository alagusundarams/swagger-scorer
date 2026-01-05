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

const pool = new Pool({ connectionString: DATABASE_URL });

async function inspect() {
    const tables = ['governance_backends', 'named_values', 'access_control_lists'];
    for (const table of tables) {
        console.log(`--- ${table} ---`);
        try {
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [table]);
            console.table(res.rows);
        } catch (e) {
            console.error(`Failed to inspect ${table}`);
        }
    }
    await pool.end();
}

inspect();
