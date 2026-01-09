import pg from 'pg';

async function checkData() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal"
    });

    try {
        await client.connect();

        console.log('\n--- PRODUCTS SUMMARY ---');
        const prods = await client.query("SELECT id, name, environment, owner_team_id FROM products LIMIT 10");
        console.table(prods.rows);

        console.log('\n--- APIS SUMMARY ---');
        const apis = await client.query("SELECT id, name, product_id, path FROM apis LIMIT 10");
        console.table(apis.rows);

        console.log('\n--- OPERATIONS SUMMARY ---');
        const ops = await client.query("SELECT api_id, method, url_template, display_name FROM operations LIMIT 10");
        console.table(ops.rows);

        console.log('\n--- SUBSCRIPTIONS SUMMARY ---');
        const subs = await client.query("SELECT id, product_id, subscriber_team_id, state FROM subscriptions LIMIT 10");
        console.table(subs.rows);

        // Check specifically for the ones the user might be looking at
        if (prods.rows.length > 0) {
            const firstProd = prods.rows[0].id;
            console.log(`\n--- SUBSCRIPTIONS for product: ${firstProd} ---`);
            const subCheck = await client.query("SELECT * FROM subscriptions WHERE product_id = $1", [firstProd]);
            console.table(subCheck.rows);
        }

    } catch (err: any) {
        console.error('Checking DB failed:', err.message);
    } finally {
        await client.end();
    }
}

checkData();
