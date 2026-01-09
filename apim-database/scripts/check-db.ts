
import pg from 'pg';

async function checkData() {
    const client = new pg.Client({
        connectionString: "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal"
    });

    try {
        await client.connect();

        console.log('--- OPERATIONS for api-legacy-01 ---');
        const ops1 = await client.query("SELECT * FROM operations WHERE api_id = 'api-legacy-01'");
        console.table(ops1.rows);

        console.log('--- OPERATIONS for api-payment-v2 ---');
        const ops2 = await client.query("SELECT * FROM operations WHERE api_id = 'api-payment-v2'");
        console.table(ops2.rows);

    } catch (err: any) {
        console.error('Checking DB failed:', err.message);
    } finally {
        await client.end();
    }
}

checkData();
