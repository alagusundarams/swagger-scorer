/**
 * @fileoverview Database Patch - Day 2 Hardening
 * 
 * Adds missing columns to live DB without dropping data.
 * Run: npx tsx apim-database/scripts/patch-db-day2.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function patch() {
    console.log('🩹 Starting Database Patch (Day 2)...');
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        // 1. Add app_registration_id to subscriptions if missing
        console.log('   Checking subscriptions table...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='subscriptions' AND column_name='app_registration_id') THEN
                    ALTER TABLE subscriptions ADD COLUMN app_registration_id TEXT REFERENCES app_registrations(id);
                    RAISE NOTICE 'Added app_registration_id to subscriptions';
                END IF;
            END $$;
        `);

        // 2. Add type to products if missing
        console.log('   Checking products table...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='products' AND column_name='type') THEN
                    ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'standard';
                    RAISE NOTICE 'Added type to products';
                END IF;
            END $$;
        `);

        // 3. Add region to products if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='products' AND column_name='region') THEN
                    ALTER TABLE products ADD COLUMN region TEXT DEFAULT 'Global';
                END IF;
            END $$;
        `);

        // 4. Add origin_team_id to apis if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='apis' AND column_name='origin_team_id') THEN
                    ALTER TABLE apis ADD COLUMN origin_team_id TEXT REFERENCES teams(id);
                END IF;
            END $$;
        `);

        // 5. Add environment to products if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='products' AND column_name='environment') THEN
                    ALTER TABLE products ADD COLUMN environment TEXT NOT NULL DEFAULT 'DEV';
                END IF;
            END $$;
        `);

        // 6. Add environment to apis if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='apis' AND column_name='environment') THEN
                    ALTER TABLE apis ADD COLUMN environment TEXT;
                END IF;
            END $$;
        `);

        console.log('   Verifying environment consistency...');
        await pool.query(`UPDATE products SET environment = 'DEV' WHERE environment IS NULL`);
        // Only update apis.environment if the column exists (was just added or already there)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name='apis' AND column_name='environment') THEN
                    UPDATE apis SET environment = 'DEV' WHERE environment IS NULL;
                END IF;
            END $$;
        `);

        console.log('✅ Patch Applied Successfully!');
    } catch (error) {
        console.error('❌ Patch Failed:', error);
    } finally {
        await pool.end();
    }
}

patch();
