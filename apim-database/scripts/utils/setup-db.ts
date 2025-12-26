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
        const configPaths = [
            join(process.cwd(), 'config.json'),
            join(process.cwd(), 'apim-self-service-backend', 'config.json'),
            join(process.cwd(), '..', 'apim-self-service-backend', 'config.json')
        ];

        for (const configPath of configPaths) {
            try {
                const config = JSON.parse(readFileSync(configPath, 'utf8'));
                if (config.database?.url) {
                    connectionString = config.database.url;
                    console.log(`✅ Loaded config from ${configPath}`);
                    break;
                }
            } catch (err) {
                // Silent fallback
            }
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
        const schemaPath = join(process.cwd(), 'init-db', '01-schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');

        console.log('📜 Executing init-db/01-schema.sql...');
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
