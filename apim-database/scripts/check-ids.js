import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend
dotenv.config({ path: path.join(process.cwd(), 'apim-self-service-backend', '.env') });

async function checkData() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        return;
    }
    console.log('Connecting to database...');

    const client = new pg.Client({
        connectionString: dbUrl
    });

    try {
        await client.connect();
        console.log('Connected!');

        console.log('\n--- ID COMPARISON (Top 5 Products) ---');
        const res = await client.query(`
            SELECT id, name, environment FROM products LIMIT 5
        `);
        console.table(res.rows);

        console.log('\n--- SAMPLE SUBSCRIPTIONS (Top 5) ---');
        const subRes = await client.query("SELECT id, product_id, display_name FROM subscriptions LIMIT 5");
        console.table(subRes.rows);

    } catch (err) {
        console.error('Checking DB failed!');
        console.error(err);
    } finally {
        await client.end();
    }
}

checkData();
