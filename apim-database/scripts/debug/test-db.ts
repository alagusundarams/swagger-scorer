import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function test() {
    const configPath = join(process.cwd(), '..', 'apim-self-service-backend', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const connectionString = config.database.url;

    console.log(`Connecting to ${connectionString}...`);
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 2000 });

    try {
        const res = await pool.query('SELECT id, name, display_name FROM products');
        console.log('✅ Connection Success!');
        console.log(`Found ${res.rowCount} products:`);
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Connection Failed:', (err as Error).message);
    } finally {
        await pool.end();
    }
}

test();
