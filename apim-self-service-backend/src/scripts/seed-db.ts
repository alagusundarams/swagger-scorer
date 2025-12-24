import 'dotenv/config';
import { initDb, query } from '../services/db.js';

async function seed() {
    console.log('🌱 Starting Database Seeding...');

    // 1. Initialize DB
    await initDb(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/apim_db');

    try {
        // 1.1 Patch Schema (Missing Columns)
        console.log('🔧 Patching Schema...');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT \'standard\'');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS management_mode TEXT DEFAULT \'PORTAL_MANAGED\'');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0');
        await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0.00');

        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS origin_team_id TEXT');
        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS git_repo_url TEXT');
        await query('ALTER TABLE apis ADD COLUMN IF NOT EXISTS git_file_path TEXT');

        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS product_id TEXT');
        await query('ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS secret_expiry_date TEXT');

        // 2. Clean Slate (Order matters for FKs)
        console.log('🧹 Cleaning existing data...');
        await query('DELETE FROM app_registrations');
        await query('DELETE FROM subscriptions');
        await query('DELETE FROM operations');
        await query('DELETE FROM apis');
        await query('DELETE FROM products');

        // Workflow / Audit tables
        await query('DELETE FROM audit_log');
        await query('DELETE FROM approval_requests');

        await query('DELETE FROM user_teams');
        await query('DELETE FROM users');

        await query('DELETE FROM teams');

        // 3. Seed Teams
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

        // 3.1 Seed Users (after Teams, so we can set default_team_id)
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
        // Payment Gateway APIs? (Mock didn't have explicit APIs for prod-001 in array, but we can add one)
        // Mobile Bundle APIs
        const apis = [
            { id: 'api-pay', product_id: 'prod-grp-001', name: 'payments-api', display_name: 'Payments API', description: 'Core payments', path: '/pay', origin_team_id: 'team-payments' },
            { id: 'api-id', product_id: 'prod-grp-001', name: 'identity-api', display_name: 'Identity API', description: 'User auth', path: '/auth', origin_team_id: 'team-platform' } // Assuming platform owned identity for this example
        ];

        for (const a of apis) {
            await query(`
                INSERT INTO apis (id, product_id, name, display_name, description, path, origin_team_id, quality_score, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 100, NOW(), NOW())
            `, [a.id, a.product_id, a.name, a.display_name, a.description, a.path, a.origin_team_id]);
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
                product_id: null // Not linked to a product yet
            },
            {
                id: 'app-grp-001',
                display_name: 'Mobile App Bundle (GRP)',
                client_id: 'client-grp-mobile',
                environment: 'PROD',
                owner_team_id: 'team-mobile',
                product_id: 'prod-grp-001' // Linked to GRP product
            }
        ];

        for (const a of apps) {
            await query(`
                INSERT INTO app_registrations (id, display_name, client_id, environment, owner_team_id, product_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [a.id, a.display_name, a.client_id, a.environment, a.owner_team_id, a.product_id]);
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
