
import pg from 'pg';

async function seedData() {
    const client = new pg.Client({
        connectionString: "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal"
    });

    try {
        await client.connect();

        console.log('--- PRODUCTS IN DB ---');
        const p = await client.query('SELECT id FROM products');
        console.log(p.rows.map(r => r.id));

        console.log('--- TEAMS IN DB ---');
        const t = await client.query('SELECT id FROM teams');
        console.log(t.rows.map(r => r.id));

        console.log('Seeding Operations...');
        await client.query(`
            INSERT INTO operations (id, api_id, name, display_name, method, url_template, description)
            VALUES 
                ('op-01', 'api-legacy-01', 'get-orders', 'Get Orders', 'GET', '/orders', 'Retrieve all orders'),
                ('op-02', 'api-legacy-01', 'create-order', 'Create Order', 'POST', '/orders', 'Create a new order'),
                ('op-03', 'api-payment-v2', 'process-payment', 'Process Payment', 'POST', '/pay', 'Process a payment')
            ON CONFLICT (id) DO NOTHING
        `);

        const subs = [
            ['sub-01', 'prod-legacy', 'team-platform', 'active', 'Platform Subscription'],
            ['sub-02', 'prod-payment-v2', 'team-payments', 'active', 'Payments Subscription'],
            ['sub-03', 'grp-shared', 'team-analytics', 'active', 'Analytics Access']
        ];

        for (const sub of subs) {
            console.log(`Seeding Subscription: ${sub[0]} for product ${sub[1]}`);
            try {
                await client.query(`
                    INSERT INTO subscriptions (id, product_id, subscriber_team_id, state, display_name)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO NOTHING
                `, sub);
            } catch (e: any) {
                console.error(`Failed to seed ${sub[0]}: ${e.message}`);
            }
        }

        console.log('✅ Seeding Complete');

    } catch (err: any) {
        console.error('Seeding failed:', err.message);
    } finally {
        await client.end();
    }
}

seedData();
