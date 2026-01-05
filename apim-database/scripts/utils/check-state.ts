
import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal' });

async function check() {
    try {
        const templates = await pool.query('SELECT id, name FROM policy_templates ORDER BY display_order');
        console.log('--- Policy Templates ---');
        console.table(templates.rows);

        const products = await pool.query('SELECT id, name, environment FROM products');
        console.log('\n--- Products ---');
        console.table(products.rows);

        const nvs = await pool.query('SELECT * FROM named_values');
        console.log('\n--- Named Values ---');
        console.log('Count:', nvs.rows.length);



    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
