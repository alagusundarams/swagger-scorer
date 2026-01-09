
import pg from 'pg';

async function seedData() {
    const client = new pg.Client({
        connectionString: "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal"
    });

    try {
        await client.connect();

        console.log('Seeding GRP Product...');
        await client.query(`
            INSERT INTO products (id, name, display_name, state, type, environment)
            VALUES ('GRP', 'grp', 'Global Resource Product', 'published', 'grp', 'DEV')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('Seeding GRP API...');
        await client.query(`
            INSERT INTO apis (id, product_id, name, display_name, path)
            VALUES ('api-grp-01', 'GRP', 'grp-api', 'GRP API Service', '/grp')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('Seeding GRP Operations...');
        await client.query(`
            INSERT INTO operations (id, api_id, name, display_name, method, url_template, description)
            VALUES 
                ('op-grp-01', 'api-grp-01', 'grp-check', 'GRP Health Check', 'GET', '/health', 'GRP health check')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('Seeding GRP Subscriptions...');
        await client.query(`
            INSERT INTO subscriptions (id, product_id, subscriber_team_id, state, display_name)
            VALUES 
                ('sub-grp-01', 'GRP', 'team-analytics', 'active', 'Analytics GRP Access')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('✅ Seeding GRP Complete');

    } catch (err: any) {
        console.error('Seeding failed:', err.message);
    } finally {
        await client.end();
    }
}

seedData();
