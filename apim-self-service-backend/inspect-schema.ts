import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://postgres:postgrespassword@localhost:5432/apim_portal"
});

async function inspectSchema() {
    const tables = ['products', 'apis', 'named_values', 'governance_backends', 'app_registrations'];

    try {
        for (const table of tables) {
            console.log(`\n--- Inspecting Table: ${table} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            if (res.rowCount === 0) {
                console.error(`❌ Table ${table} NOT FOUND!`);
            } else {
                res.rows.forEach(col => {
                    console.log(`Col: ${col.column_name.padEnd(20)} | Type: ${col.data_type.padEnd(15)} | Null: ${col.is_nullable.padEnd(5)} | Default: ${col.column_default || 'NONE'}`);
                });
            }
        }
    } catch (err) {
        console.error('❌ Schema inspection failed:', err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
