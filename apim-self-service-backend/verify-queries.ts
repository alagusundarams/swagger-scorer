import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://postgres:postgrespassword@localhost:5432/apim_portal"
});

async function verifyQueries() {
    try {
        console.log('--- Verifying Products Query ---');
        const prodRes = await pool.query(`
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
        console.log('✅ Products Query OK. Rows:', prodRes.rowCount);
        if (prodRes.rowCount > 0) {
            console.log('Sample Product Environment:', prodRes.rows[0].environment);
            console.log('Sample Product Prod Hash (alias):', prodRes.rows[0].prod_hash);
        }

        console.log('\n--- Verifying Named Values Query ---');
        const nvRes = await pool.query(`
            SELECT nv.id, nv.system_name, nv.display_name, nv.environment, nv.region, nv.value, nv.product_id, nv.scope_id, nv.updated_at
            FROM named_values nv
            ORDER BY nv.system_name ASC
        `);
        console.log('✅ Named Values Query OK. Rows:', nvRes.rowCount);
        if (nvRes.rowCount > 0) {
            console.log('Sample NV Environment:', nvRes.rows[0].environment);
            console.log('Sample NV Region:', nvRes.rows[0].region);
        }

        console.log('\n--- Verifying Backends Query ---');
        const beRes = await pool.query(`
            SELECT * FROM governance_backends
        `);
        console.log('✅ Backends Query OK. Rows:', beRes.rowCount);
        if (beRes.rowCount > 0) {
            console.log('Sample Backend Region:', beRes.rows[0].region);
            console.log('Sample Backend Environment:', beRes.rows[0].environment);
        }

    } catch (err) {
        console.error('❌ Query verification failed:', err);
    } finally {
        await pool.end();
    }
}

verifyQueries();
