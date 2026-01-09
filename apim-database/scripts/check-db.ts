import pg from 'pg';

async function checkData() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal"
    });

    try {
        await client.connect();

        console.log('\n--- TOTAL COUNTS ---');
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM apis) as apis,
                (SELECT COUNT(*) FROM operations) as operations,
                (SELECT COUNT(*) FROM subscriptions) as subscriptions,
                (SELECT COUNT(*) FROM named_values) as named_values
        `);
        console.table(counts.rows);

        console.log('\n--- PRODUCTS SUMMARY (TOP 5) ---');
        const prods = await client.query("SELECT id, name, environment, owner_team_id FROM products LIMIT 5");
        console.table(prods.rows);

        console.log('\n--- SUBSCRIPTIONS SUMMARY (TOP 5) ---');
        const subs = await client.query("SELECT id, product_id, subscriber_team_id, state FROM subscriptions LIMIT 5");
        console.table(subs.rows);

        console.log('\n--- NAMED VALUES SUMMARY (TOP 5) ---');
        const nvs = await client.query("SELECT id, product_id, system_name, environment FROM named_values LIMIT 5");
        console.table(nvs.rows);

        // Check specifically for mapping between first product and its subscriptions
        if (prods.rows.length > 0) {
            const firstProd = prods.rows[0].id;
            console.log(`\n--- LINK CHECK for Product ID: ${firstProd} ---`);
            const subCount = await client.query("SELECT COUNT(*) FROM subscriptions WHERE product_id = $1", [firstProd]);
            const nvCount = await client.query("SELECT COUNT(*) FROM named_values WHERE product_id = $1", [firstProd]);
            console.log(`Subscriptions: ${subCount.rows[0].count}`);
            console.log(`Named Values: ${nvCount.rows[0].count}`);
        }

    } catch (err: any) {
        console.error('Checking DB failed:', err.message);
    } finally {
        await client.end();
    }
}

checkData();
