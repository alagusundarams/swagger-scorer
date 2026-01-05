import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://postgres:postgrespassword@localhost:5432/apim_portal"
});

async function test() {
    try {
        console.log('Testing Products Query...');
        const res = await pool.query(`
            SELECT p.*, 
                   t.name as owner_team_name,
                   p.dev_hash, p.qa_hash, p.stage_hash, p.production_hash as prod_hash,
                   COALESCE(sub_counts.active_subscribers, 0) as calculated_subscriber_count,
                   ar.client_id as identity_client_id,
                   ar.display_name as identity_display_name
            FROM products p
            LEFT JOIN teams t ON p.owner_team_id = t.id
            LEFT JOIN app_registrations ar ON ar.product_id = p.id AND ar.api_id IS NULL
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as active_subscribers
                FROM subscriptions
                WHERE subscriptions.product_id = p.id
                AND subscriptions.state = 'active'
            ) sub_counts ON true
            ORDER BY p.display_name ASC
        `);
        console.log('✅ Query 1 Success. Rows:', res.rowCount);

        console.log('Testing APIs Query...');
        const apiRes = await pool.query(`
            SELECT a.*, o.json_data as operations_json
            FROM apis a
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
        `);
        console.log('✅ Query 2 Success. Rows:', apiRes.rowCount);

    } catch (err) {
        console.error('❌ Query Failed:', err);
    } finally {
        await pool.end();
    }
}

test();
