import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIG LOADER ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(__dirname, '..', '..', 'config.json');

    let configPath = '';
    if (existsSync(rootConfig)) configPath = rootConfig;
    else if (existsSync(localConfig)) configPath = localConfig;
    else if (existsSync(relativeConfig)) configPath = relativeConfig;

    if (configPath) {
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    console.error("❌ Config file not found.");
    process.exit(1);
}

const config = loadConfig();

// --- ENV SELECTION ---
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const targetEnvName = envArg ? envArg.split('=')[1] : null;

let dbUrl = '';
if (targetEnvName) {
    const targetEnvConfig = config.azure?.environments?.find((e: any) => e.name === targetEnvName);
    if (targetEnvConfig?.databaseUrl) {
        dbUrl = targetEnvConfig.databaseUrl;
    }
}
if (!dbUrl) dbUrl = config.database?.url;

if (!dbUrl) {
    console.error("❌ No databaseUrl found.");
    process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function resetDb() {
    try {
        console.log(`🧨 NUCLEAR RESET: Dropping and Recreating Schema...`);
        const safeUrl = dbUrl.replace(/:[^:@]+@/, ':***@');
        console.log(`   Target: ${safeUrl}`);

        const getSchema = () => {
            const rootPath = join(process.cwd(), 'apim-database', 'init-db', '01-schema.sql');
            if (existsSync(rootPath)) return readFileSync(rootPath, 'utf8');

            const relPath = join(__dirname, '..', '..', 'init-db', '01-schema.sql');
            if (existsSync(relPath)) return readFileSync(relPath, 'utf8');

            throw new Error('Schema file (01-schema.sql) not found.');
        };

        const schemaSql = getSchema();
        await pool.query(schemaSql);

        console.log("✅ Database Reset Complete. Schema applied.");
        console.log("👉 Now run the discovery flow: npm run discover-sync");

    } catch (err: any) {
        console.error("❌ Reset Failed:", err);
    } finally {
        await pool.end();
    }
}

resetDb();
