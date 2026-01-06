
import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Minimal config loader
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json'),
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function seedOrphans() {
    console.log('🌱 Seeding orphan products for UI Verification...');
    console.log(`   Target: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

    const pool = new Pool({ connectionString: DATABASE_URL });
    const query = (text: string, params?: any[]) => pool.query(text, params);

    try {
        // 1. Create a "Legacy" team if it doesn't exist
        await query(`
            INSERT INTO teams (id, name, description, azure_ad_group_id)
            VALUES ('legacy-team', 'Legacy Team', 'A team for legacy stuff', '0000-0000')
            ON CONFLICT (id) DO NOTHING
        `);

        // 2. Insert Orphan Products (NULL owner_team_id)
        const orphans = [
            { id: 'orphan-prod-1', name: 'Legacy API Gateway', env: 'PROD', version: 'v1.0' },
            { id: 'orphan-prod-2', name: 'Old Payment Service', env: 'PROD', version: 'v2.1' },
            { id: 'orphan-prod-3', name: 'Deprecated Auth', env: 'STAGE', version: 'v0.9' },
            { id: 'orphan-prod-4', name: 'Test Product A', env: 'DEV', version: 'v0.1' },
            { id: 'orphan-prod-5', name: 'Test Product B', env: 'DEV', version: 'v0.1' },
            { id: 'orphan-prod-6', name: 'QAResults Service', env: 'QA', version: 'v1.5' },
            { id: 'orphan-prod-7', name: 'Unassigned Mobile API', env: 'PROD', version: 'v3.0' },
            { id: 'orphan-prod-8', name: 'Ghost Service', env: 'STAGE', version: 'v?' },
        ];

        for (const p of orphans) {
            await query(`
                INSERT INTO products (
                    id, name, display_name, version, state, 
                    owner_team_id, environment, region, type, visibility, 
                    management_mode, created_at, updated_at
                ) VALUES (
                    $1, $2, $2, $3, 'published',
                    NULL, $4, 'Global', 'standard', 'internal',
                    'TERRAFORM_MANAGED', NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    owner_team_id = NULL,
                    updated_at = NOW()
            `, [p.id, p.name, p.version, p.env]);
        }

        console.log(`✅ Seeded ${orphans.length} orphan products.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedOrphans();
