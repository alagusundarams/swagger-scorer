import 'dotenv/config';
import { query } from './src/services/db.js';

async function inspect() {
    const tables = ['governance_backends', 'named_values', 'access_control_lists', 'orphaned_resources'];

    for (const table of tables) {
        console.log(`--- ${table} ---`);
        try {
            const b = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
            console.table(b.rows);
        } catch (e) {
            console.error(`Failed to inspect ${table}`);
        }
    }

    process.exit(0);
}

inspect();
