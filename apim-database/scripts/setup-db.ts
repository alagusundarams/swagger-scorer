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
    // Robust Path Resolution: Check local dir first, then project root construction
    let configPath = join(process.cwd(), 'config.json');
    let schemaPath = join(process.cwd(), 'schema', 'schema.sql');

    if (!existsSync(configPath)) {
        configPath = join(process.cwd(), 'apim-database', 'config.json');
        schemaPath = join(process.cwd(), 'apim-database', 'schema', 'schema.sql');
    }

    if (!existsSync(configPath)) {
        console.error('❌ Error: config.json not found in apim-database directory.');
        console.log('Please copy config.template.json to config.json and fill in your details.');
        process.exit(1);
    }

    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const dbUrl = config.database?.url;

    if (!dbUrl) {
        console.error('❌ Error: database.url not found in config.json');
        process.exit(1);
    }

    console.log('🔄 Initializing Database...');
    console.log(`📡 Target: ${dbUrl.split('@')[1]}`); // Mask credentials

    // 1. Connect and verify connection
    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL.');

        // 2. Read and apply schema
        if (!existsSync(schemaPath)) {
            console.error(`❌ Error: Schema file not found at ${schemaPath}`);
            process.exit(1);
        }

        const schema = readFileSync(schemaPath, 'utf8');
        console.log('📜 Applying schema.sql...');

        // Split schema into individual commands for better error reporting
        // Note: Simple split by semicolon might break on functions/triggers, but schema.sql is simple
        await client.query(schema);

        console.log('✨ Database initialized successfully!');
    } catch (error: any) {
        console.error('❌ Initialization failed:', error.message);

        if (error.code === '3D000') {
            console.log('\n💡 Tip: The database specified in the URL does not exist.');
            console.log('Please create it first (e.g., "CREATE DATABASE apim;") or update the URL.');
        }
    } finally {
        await client.end();
    }
}

main();
