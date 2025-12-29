import 'dotenv/config';
import { initDb, query } from '../services/db.js';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

async function migrate() {
    console.log('🚀 Starting Schema Migration...');

    // Load connection string from config.json if not in env
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        try {
            const configPath = resolve(process.cwd(), 'config.json');
            const config = JSON.parse(await readFile(configPath, 'utf8'));
            dbUrl = config.database.url;
        } catch (e) {
            dbUrl = 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';
        }
    }

    await initDb(dbUrl!);

    try {
        console.log('🔧 Patching app_registrations...');
        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS secret_expiry_date TEXT');
        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS app_id_uri TEXT');
        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS product_id TEXT');

        console.log('🔧 Patching products...');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT \'standard\'');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS management_mode TEXT DEFAULT \'PORTAL_MANAGED\'');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS region TEXT DEFAULT \'Global\'');

        console.log('🔧 Patching apis...');
        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS origin_team_id TEXT');
        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS git_repo_url TEXT');
        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS git_file_path TEXT');

        console.log('🔧 Patching teams...');
        await query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS region TEXT DEFAULT \'Global\'');

        console.log('👤 Adding users...');
        await query(`
            INSERT INTO users (id, email, name, azure_ad_object_id, role)
            VALUES 
                ('system-user', 'system@example.com', 'System Process', 'oid-system', 'admin'),
                ('admin-user', 'admin-user@example.com', 'Admin User', 'oid-admin-user', 'admin')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('🔧 Creating api_onboarding_staging...');
        await query(`
            CREATE TABLE IF NOT EXISTS api_onboarding_staging (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                api_name TEXT NOT NULL,
                blob_path TEXT NOT NULL,
                status TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        console.log('✅ Migration Successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
