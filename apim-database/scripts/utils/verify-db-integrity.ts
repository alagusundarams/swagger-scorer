
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load Config
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const dbUrl = config.database?.url || "postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal";

const pool = new Pool({ connectionString: dbUrl });

async function verify() {
    console.log(`🔍 Verifying Database Integrity...`);
    console.log(`🔌 Connection: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

    try {
        // 1. Check CONNECTION
        await pool.query('SELECT 1');
        console.log(`✅ Database Linked`);

        // 2. Counts
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM apis) as apis,
                (SELECT COUNT(*) FROM named_values) as named_values,
                (SELECT COUNT(*) FROM policy_templates) as templates,
                (SELECT COUNT(*) FROM teams) as teams
        `);

        console.log('\n📊 Data Counts:');
        console.table(counts.rows[0]);

        const data = counts.rows[0];

        // 3. Logic Checks
        const errors: string[] = [];

        if (parseInt(data.products) === 0) errors.push("❌ No Products found.");
        if (parseInt(data.templates) === 0) errors.push("❌ No Policy Templates found. Run 'npm run seed-demo'?");

        // 4. Named Value Checks
        const orphans = await pool.query(`
            SELECT COUNT(*) as count FROM named_values WHERE product_id IS NULL AND scope_id IS NULL
        `);
        if (parseInt(orphans.rows[0].count) > 0) {
            console.warn(`⚠️  Found ${orphans.rows[0].count} Named Values/ACLs without Product link (Global?).`);
        }

        // 5. Products check
        const ghostProducts = await pool.query(`
            SELECT COUNT(*) as count FROM products WHERE environment IS NULL
        `);
        if (parseInt(ghostProducts.rows[0].count) > 0) {
            errors.push(`❌ Found ${ghostProducts.rows[0].count} Products with NULL environment.`);
        }

        if (errors.length > 0) {
            console.error("\n💥 Integrity Check FAILED:");
            errors.forEach(e => console.error(e));
            process.exit(1);
        } else {
            console.log("\n✅ Database Integrity Verified! Ready for UI.");
            process.exit(0);
        }

    } catch (e: any) {
        console.error(`\n❌ Fatal Verification Error:`, e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verify();
