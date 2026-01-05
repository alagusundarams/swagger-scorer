import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function verifyOperations() {
    console.log('🔍 Verifying Operations Table Population...');

    // Connection setup
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        const configPaths = [
            join(process.cwd(), 'apim-self-service-backend', 'config.json'),
            join(process.cwd(), '..', 'apim-self-service-backend', 'config.json'),
            join(process.cwd(), 'config.json')
        ];
        for (const p of configPaths) {
            if (existsSync(p)) {
                const config = JSON.parse(readFileSync(p, 'utf8'));
                connectionString = config.database?.url;
                if (connectionString) break;
            }
        }
    }

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found');
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString });

    try {
        // Count operations
        const countRes = await pool.query('SELECT COUNT(*) FROM operations');
        console.log(`\n✅ Total Operations: ${countRes.rows[0].count}`);

        // Sample operations
        const sampleRes = await pool.query(`
            SELECT id, api_id, method, url_template, display_name, description
            FROM operations
            ORDER BY api_id, method, url_template
            LIMIT 20
        `);

        if ((sampleRes.rowCount ?? 0) > 0) {
            console.log('\n📊 Sample Operations:');
            console.table(sampleRes.rows);
        } else {
            console.log('\n⚠️  No operations found in the database.');
        }

    } catch (err) {
        console.error('\n❌ Verification Failed:', (err as Error).message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyOperations();
