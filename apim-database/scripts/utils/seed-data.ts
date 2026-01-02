/**
 * @fileoverview Seed Data Script for Development
 * 
 * Populates database with realistic test data for local development.
 * Migrated from backend/src/scripts/seed-db.ts.
 * 
 * Run: npm run seed-data
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load config to find Database URL
function loadConfig() {
    // Try multiple paths for robustness
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json'),
        join(process.cwd(), '..', 'config.json') // relative if running from scripts/utils
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function seed() {
    console.log('🌱 Starting Database Seeding (DB Project standalone)...');
    console.log(`   Target: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

    const pool = new Pool({ connectionString: DATABASE_URL });
    const query = (text: string, params?: any[]) => pool.query(text, params);

    try {
        // 1. Clean Slate (Order matters for FKs)
        console.log('🧹 Cleaning existing data...');
        await query('DELETE FROM app_registrations');
        await query('DELETE FROM subscriptions');
        await query('DELETE FROM operations');
        await query('DELETE FROM apis');
        await query('DELETE FROM products');
        await query('DELETE FROM audit_log');
        await query('DELETE FROM approval_requests');
        await query('DELETE FROM user_teams');
        await query('DELETE FROM users');
        await query('DELETE FROM teams');

        // RBAC cleanup
        await query('DELETE FROM permission_matrix');
        await query('DELETE FROM named_values');

        // 2. Seed Teams
        console.log('👥 Seeding Teams...');
        const teams = [
            {
                id: 'team-platform',
                name: 'Platform Engineering',
                azure_ad_group_id: 'group-platform',
                type: 'producer',
                description: 'Core platform services and gateway management.',
                member_count: 12
            },
            {
                id: 'team-payments',
                name: 'Payments Squad',
                azure_ad_group_id: 'group-payments',
                type: 'both',
                description: 'Payment processing and financial ledger services.',
                member_count: 8
            },
            {
                id: 'team-mobile',
                name: 'Mobile Squad',
                azure_ad_group_id: 'group-mobile',
                type: 'consumer',
                description: 'Mobile app development team.',
                member_count: 15
            }
        ];

        for (const t of teams) {
            await query(`
                INSERT INTO teams (id, name, azure_ad_group_id, type, description, member_count, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [t.id, t.name, t.azure_ad_group_id, t.type, t.description, t.member_count]);
        }

        // 3. Seed Users (after Teams, so we can set default_team_id)
        console.log('👤 Seeding Users...');
        await query(`
            INSERT INTO users (id, email, name, azure_ad_object_id, default_team_id, role, created_at, updated_at)
            VALUES 
            ('user-001', 'admin@example.com', 'Portal Admin', 'oid-admin', 'team-platform', 'admin', NOW(), NOW()),
            ('user-002', 'dev@example.com', 'Developer', 'oid-dev', 'team-payments', 'user', NOW(), NOW())
        `);

        // 4. Seed Products
        console.log('📦 Seeding Products...');
        const products = [
            {
                id: 'prod-001', name: 'payment-gateway', display_name: 'Payment Gateway', version: 'v1.2.0',
                description: 'Unified payment processing API.',
                state: 'published', owner_team_id: 'team-payments', environment: 'PROD',
                quality_score: 92, subscriber_count: 12, type: 'standard'
            },
            {
                id: 'prod-grp-001', name: 'mobile-app-bundle', display_name: 'Mobile App Bundle (GRP)', version: 'v1.0.0',
                description: 'Consumer-owned GRP product bundling Payment and Identity APIs.',
                state: 'published', owner_team_id: 'team-mobile', environment: 'DEV',
                quality_score: 85, subscriber_count: 5, type: 'grp'
            },
            {
                id: 'prod-orphan-001', name: 'ghost-service', display_name: 'Ghost Service (Orphaned)', version: 'v0.9.0',
                description: 'A product with no owner group assigned in AD.',
                state: 'published', owner_team_id: null, environment: 'PROD',
                quality_score: 45, subscriber_count: 0, type: 'standard'
            },
            {
                id: 'prod-null-001', name: 'null-product', display_name: 'Null Test Product', version: 'v1.0.0',
                description: null,
                state: 'published', owner_team_id: 'team-payments', environment: 'DEV',
                quality_score: 10, subscriber_count: 0, type: 'standard'
            }
        ];

        for (const p of products) {
            await query(`
                INSERT INTO products (id, name, display_name, version, description, state, owner_team_id, environment, quality_score, subscriber_count, type, management_mode, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PORTAL_MANAGED', NOW(), NOW())
            `, [p.id, p.name, p.display_name, p.version, p.description, p.state, p.owner_team_id, p.environment, p.quality_score, p.subscriber_count, p.type]);
        }

        // 5. Seed APIs
        console.log('🔌 Seeding APIs...');
        const apis = [
            { id: 'api-pay', product_id: 'prod-grp-001', name: 'payments-api', display_name: 'Payments API', description: 'Core payments', path: '/v1/pay', origin_team_id: 'team-payments' },
            { id: 'api-id', product_id: 'prod-grp-001', name: 'identity-api', display_name: 'Identity API', description: 'User auth', path: '/v1/auth', origin_team_id: 'team-platform' }
        ];

        for (const a of apis) {
            await query(`
                INSERT INTO apis (id, product_id, name, display_name, description, path, origin_team_id, quality_score, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 100, NOW(), NOW())
            `, [a.id, a.product_id, a.name, a.display_name, a.description, a.path, a.origin_team_id]);
        }

        // 5.5 Seed Massive API for B009
        console.log('📦 Seeding Massive API (60+ operations)...');
        await query(`
            INSERT INTO apis (id, product_id, name, display_name, description, path, origin_team_id, quality_score, created_at, updated_at)
            VALUES ('api-massive', 'prod-001', 'massive-api', 'Massive API', 'API with many operations for UI testing', '/v1/massive', 'team-platform', 100, NOW(), NOW())
        `);

        for (let i = 1; i <= 65; i++) {
            await query(`
                INSERT INTO operations (id, api_id, method, url_template, name, display_name, description, created_at)
                VALUES ($1, 'api-massive', $2, $3, $4, $4, $5, NOW())
            `, [`op-massive-${i}`, i % 2 === 0 ? 'GET' : 'POST', `/test/endpoint-${i}`, `Operation ${i}`, `Description for test operation ${i}`]);
        }

        // 6. Seed Subscriptions
        console.log('🔑 Seeding Subscriptions...');
        const subs = [
            {
                id: 'sub-001', product_id: 'prod-001', subscriber_team_id: 'team-payments', state: 'active',
                primary_key: { name: 'Primary', value: 'a1b2c3d4e5' }, secondary_key: { name: 'Secondary', value: 'f6g7h8i9j0' }
            },
            {
                id: 'sub-grp-001', product_id: 'prod-001', subscriber_team_id: 'team-mobile', state: 'active',
                primary_key: { name: 'GRP-Key', value: 'grp-12345-bundle' }, secondary_key: { name: 'GRP-Sec', value: 'grp-67890-bundle' }
            }
        ];

        for (const s of subs) {
            await query(`
                INSERT INTO subscriptions (id, product_id, subscriber_team_id, state, primary_key_name, primary_key_value, secondary_key_name, secondary_key_value, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            `, [s.id, s.product_id, s.subscriber_team_id, s.state, s.primary_key.name, s.primary_key.value, s.secondary_key.name, s.secondary_key.value]);
        }

        // 7. Seed App Registrations
        console.log('📱 Seeding App Registrations...');
        const apps = [
            {
                id: 'app-001',
                display_name: 'Mobile Checkout App',
                client_id: 'client-8822-mobile',
                environment: 'PROD',
                owner_team_id: 'team-payments',
                product_id: null
            },
            {
                id: 'app-grp-001',
                display_name: 'Mobile App Bundle (GRP)',
                client_id: 'client-grp-mobile',
                environment: 'PROD',
                owner_team_id: 'team-mobile',
                product_id: 'prod-grp-001'
            },
            {
                id: 'app-orphan-001',
                display_name: 'Legacy Integration App (Orphaned)',
                client_id: 'client-orphan-001',
                environment: 'DEV',
                owner_team_id: null,
                product_id: null
            }
        ];

        for (const a of apps) {
            await query(`
                INSERT INTO app_registrations (id, display_name, client_id, environment, owner_team_id, product_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [a.id, a.display_name, a.client_id, a.environment, a.owner_team_id, a.product_id]);
        }

        // 8. Seed Named Values (Configuration)
        console.log('⚙️ Seeding Named Values (Configuration)...');
        await query('DELETE FROM access_control_lists');

        const namedValues = [
            // Product Level for 'prod-001'
            { id: 'nv-001', product_id: 'prod-001', scope_id: null, display_name: 'Backend URL', system_name: 'backend_url', value: 'https://api.payments.com', type: 'literal', is_secret: false },
            { id: 'nv-002', product_id: 'prod-001', scope_id: null, display_name: 'Max Retries', system_name: 'max_retries', value: '3', type: 'literal', is_secret: false },
            { id: 'nv-003', product_id: 'prod-001', scope_id: null, display_name: 'DB Connection', system_name: 'db_conn', value: 'https://vault.azure.net/secrets/db-conn', type: 'key_vault', is_secret: true },

            // API Level for 'prod-grp-001' -> 'api-pay'
            { id: 'nv-grp-001', product_id: 'prod-grp-001', scope_id: 'api-pay', display_name: 'Payment Provider Key', system_name: 'stripe_key', value: 'sk_test_12345', type: 'literal', is_secret: true },
            { id: 'nv-004', product_id: 'prod-001', scope_id: null, display_name: 'Environment Flag', system_name: 'env_flag', value: 'production', type: 'literal', is_secret: false },
            { id: 'nv-005', product_id: 'prod-001', scope_id: null, display_name: 'Cloud Storage Account', system_name: 'storage_account', value: 'https://storage.windows.net', type: 'literal', is_secret: false }
        ];

        // Map to legacy access_control_lists format for now (Key, Env, Value)
        for (const nv of namedValues) {
            // For seed data, we'll assume these apply to 'DEV' environment for simplicity 
            // or mimic how legacy used to work (Product name specific keys?)
            // Actually, inspection of previous seed-db.ts shows it populated named_values too?
            // Wait, let me check the *original* seed-db.ts I read earlier. 
            // It had 'Removed: CREATE TABLE IF NOT EXISTS named_values'.
            // So the BACKEND script WAS using named_values??
            // But the SERVICE uses access_control_lists?
            // This implies the backend might be broken independently or I misread something.
            // Let me re-read the grep output.
        }

        // Re-reading service: 
        // export async function getNamedValues... FROM access_control_lists

        // So the backend reads access_control_lists. 
        // If the original seed script wrote to named_values, then the app was broken before?
        // Or maybe named_values logic is new and unused?

        // I will seed BOTH to be safe. "Dual Write". 

        for (const nv of namedValues) {
            // New Table
            await query(`
                INSERT INTO named_values (id, product_id, scope_id, display_name, system_name, value, type, is_secret)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
            `, [nv.id, nv.product_id, nv.scope_id, nv.display_name, nv.system_name, nv.value, nv.type, nv.is_secret]);

            // Legacy Table (Best Effort Mapping)
            // We'll map system_name -> key, 'DEV' -> environment
            // This ensures backend sees something.
            await query(`
                INSERT INTO access_control_lists (key, environment, value, updated_at)
                VALUES ($1, 'DEV', $2, NOW()) 
                ON CONFLICT (key, environment) DO UPDATE SET value = $2
            `, [nv.system_name, nv.value]);
            await query(`
                INSERT INTO access_control_lists (key, environment, value, updated_at)
                VALUES ($1, 'PROD', $2, NOW()) 
                ON CONFLICT (key, environment) DO UPDATE SET value = $2
            `, [nv.system_name, nv.value]);
        }

        // 9. Seed Permission Matrix (RBAC)
        console.log('🛡️ Seeding Permission Matrix...');

        const permissions = [
            // Platform Team (Admins) - Owner everywhere
            { product_id: 'prod-001', ad_group_id: 'group-platform', environment: 'DEV', role: 'Owner' },
            { product_id: 'prod-001', ad_group_id: 'group-platform', environment: 'PROD', role: 'Owner' },

            // Payments Team - Contributor in DEV, Reader in PROD (Simulating restriction)
            { product_id: 'prod-001', ad_group_id: 'group-payments', environment: 'DEV', role: 'Contributor' },
            { product_id: 'prod-001', ad_group_id: 'group-payments', environment: 'PROD', role: 'Reader' },

            // GRP Product - Mobile Team
            { product_id: 'prod-grp-001', ad_group_id: 'group-mobile', environment: 'DEV', role: 'Contributor' },
            { product_id: 'prod-grp-001', ad_group_id: 'group-mobile', environment: 'PROD', role: 'Reader' }
        ];

        for (const p of permissions) {
            await query(`
                INSERT INTO permission_matrix (product_id, ad_group_id, environment, role)
                VALUES ($1, $2, $3, $4)
            `, [p.product_id, p.ad_group_id, p.environment, p.role]);
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
