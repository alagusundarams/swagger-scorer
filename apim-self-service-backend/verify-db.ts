import { query } from './src/services/db.js';

async function verify() {
    try {
        const prodCount = await query('SELECT count(*) FROM products');
        console.log('Product Count:', prodCount.rows[0].count);

        const apiCount = await query('SELECT count(*) FROM apis');
        console.log('API Count:', apiCount.rows[0].count);

        const products = await query('SELECT id, name, environment, owner_team_id FROM products');
        console.log('Products:', JSON.stringify(products.rows, null, 2));
    } catch (e) {
        console.error('Verify failed:', e);
    } finally {
        process.exit(0);
    }
}

verify();
