import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://postgres:postgrespassword@localhost:5432/apim_portal"
});

async function updateSchema() {
    try {
        console.log('Applying Schema Fixes...');

        // Fix named_values
        await pool.query(`
            ALTER TABLE named_values 
            ADD COLUMN IF NOT EXISTS environment TEXT,
            ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Global';
        `);
        console.log('✅ named_values updated (environment, region added)');

        // Fix governance_backends
        await pool.query(`
            ALTER TABLE governance_backends 
            ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Global',
            ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id),
            ADD COLUMN IF NOT EXISTS api_id TEXT REFERENCES apis(id),
            ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('PRODUCT', 'API', 'GLOBAL'));
        `);
        console.log('✅ governance_backends updated (region, product_id, api_id, scope added)');

        // Backfill environment for existing named_values if possible
        await pool.query(`
            UPDATE named_values nv
            SET environment = p.environment
            FROM products p
            WHERE nv.product_id = p.id AND nv.environment IS NULL;
        `);
        console.log('✅ named_values environment backfilled from products');

    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        await pool.end();
    }
}

updateSchema();
