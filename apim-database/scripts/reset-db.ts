import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// --- CONFIG LOADER (MATCHING SYNC LOGIC) ---
function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(__dirname, '..', 'config.json');

    let configPath = '';
    if (existsSync(rootConfig)) configPath = rootConfig;
    else if (existsSync(localConfig)) configPath = localConfig;
    else if (existsSync(relativeConfig)) configPath = relativeConfig;

    if (configPath) {
        console.log(`📂 Using config from: ${configPath}`);
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    console.error("❌ Config file not found in standard locations.");
    process.exit(1);
}

const config = loadConfig();

// --- ENV SELECTION ---
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const targetEnvName = envArg ? envArg.split('=')[1] : null;

// Determine DB URL
let dbUrl = '';

if (targetEnvName) {
    const targetEnvConfig = config.azure?.environments?.find((e: any) => e.name === targetEnvName);
    if (targetEnvConfig?.databaseUrl) {
        dbUrl = targetEnvConfig.databaseUrl;
        console.log(`🌍 Selected Environment: ${targetEnvName}`);
    } else {
        console.warn(`⚠️ Environment '${targetEnvName}' found, but no 'databaseUrl' defined. Falling back to global default.`);
    }
}

// Fallback to global default
if (!dbUrl) {
    dbUrl = config.database?.url;
}

if (!dbUrl) {
    console.error("❌ No databaseUrl found in config.json. (Checked env specific and global default).");
    process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function resetDb() {
    try {
        console.log(`🧨 NUCLEAR RESET: Dropping and Recreating Schema...`);
        // Mask password in logs
        const safeUrl = dbUrl.replace(/:[^:@]+@/, ':***@');
        console.log(`   Target: ${safeUrl}`);

        const schemaPath = join(process.cwd(), 'apim-database', 'init-db', '01-schema.sql');
        if (!existsSync(schemaPath)) {
            throw new Error('Schema file not found at ' + schemaPath);
        }

        const schemaSql = readFileSync(schemaPath, 'utf8');

        // Execute the entire SQL file
        await pool.query(schemaSql);

        console.log("✅ Database Reset Complete. Schema applied.");
        console.log("👉 Now run: npx tsx apim-database/scripts/sync-apim-to-db.ts --env=" + (targetEnvName || 'DEV'));

    } catch (err) {
        console.error("❌ Reset Failed:", err);
    } finally {
        await pool.end();
    }
}

resetDb();
