import pg from 'pg';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const { Pool } = pg;

const pool = new Pool({
    connectionString: config.database.url,
});

async function checkSchema() {
    try {
        const operationsCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'operations';
        `);
        console.log('Operations Columns:');
        console.table(operationsCols.rows);

        const apisCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'apis';
        `);
        console.log('APIs Columns:');
        console.table(apisCols.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
