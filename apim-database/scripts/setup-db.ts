/**
 * Database Setup Script
 * Cross-platform script to initialize the database schema
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function setupDatabase() {
    // Get database URL from environment or config
    let connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        const configPath = join(process.cwd(), 'config.json');
        try {
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            connectionString = config.database?.url;
        } catch (err) {
            console.error('❌ Could not load config.json');
        }
    }

    if (!connectionString) {
        console.error('❌ DATABASE_URL environment variable or database.url in config.json is required');
        process.exit(1);
    }

    console.log('🔧 Connecting to database...');
    const pool = new Pool({ connectionString });

    try {
        // Read schema file
        const schemaPath = join(process.cwd(), 'schema', 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');

        console.log('📜 Executing schema.sql...');
        await pool.query(schema);

        console.log('✅ Database schema created successfully');
    } catch (err) {
        console.error('❌ Failed to create schema:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase();
