/**
 * PostgreSQL Initialization Script
 * 
 * Verifies connection and applies schema from config.json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
const { Client } = pg;

async function main() {
    // Priority 1: apim-database/config.json (Root perspective)
    // Priority 2: config.json (Local perspective)
    // Priority 3: ../config.json (Script-relative perspective)
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(__dirname, '..', 'config.json');

    let configPath = '';
    if (existsSync(rootConfig)) configPath = rootConfig;
    else if (existsSync(localConfig)) configPath = localConfig;
    else if (existsSync(relativeConfig)) configPath = relativeConfig;

    if (!configPath) {
        console.error('❌ Error: config.json not found.');
        console.log('Ensure apim-database/config.json exists.');
        process.exit(1);
    }

    // Resolve schema path relative to configPath
    const schemaPath = join(configPath, '..', 'schema', 'schema.sql');

    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const dbUrl = config.database?.url;

    console.log(`📂 Using config from: ${configPath}`);
    console.log('🔄 Initializing Database...');
    console.log(`📡 Target: ${dbUrl.split('@')[1]}`); // Mask credentials

    // 1. Connect and verify connection
    const client = new Client({ connectionString: dbUrl });

    try {
        console.log('📡 Attempting to connect to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected to PostgreSQL successfully.');

        // 2. Read and apply schema
        if (!existsSync(schemaPath)) {
            console.error(`❌ Error: Schema file not found at ${schemaPath}`);
            process.exit(1);
        }

        const schema = readFileSync(schemaPath, 'utf8');
        console.log(`📜 Read schema.sql (${schema.length} bytes).`);
        console.log('🛠️ Applying schema to database...');

        await client.query(schema);

        console.log('✨ Database initialized successfully!');
    } catch (error: any) {
        console.error('❌ FAILED at stage:', error.code ? `Postgres Error (${error.code})` : 'Connection/Internal Error');
        console.error('📝 Error Message:', error.message);

        if (error.code === '3D000') {
            console.log('\n💡 Tip: The database specified in the URL does not exist.');
            console.log('Please create it first (e.g., "CREATE DATABASE apim;") or update the URL.');
        } else if (error.code === '28P01') {
            console.log('\n💡 Tip: Password authentication failed. Check your password in config.json.');
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Tip: Connection refused. Is your Docker container running and port 5432 mapped?');
        }
    } finally {
        await client.end();
    }
}

main();
